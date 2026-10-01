import manifest from "material-icon-theme/dist/material-icons.json";
import { MaterialIconManifest, IconModule } from "./FileSystemIcon.types";

const theme = manifest as MaterialIconManifest;

const iconModules = import.meta.glob<IconModule>(
  "../../../node_modules/material-icon-theme/icons/*.svg",
  {
    query: "?url",
  },
);

const iconUrlCache = new Map<string, Promise<string | null>>();

export async function resolveFileSystemIcon(
  path: string,
  directory: boolean,
  expanded = false,
): Promise<string | null> {
  const normalizedPath = normalizePath(path);
  const name = getBaseName(normalizedPath).toLowerCase();

  const iconId = directory
    ? resolveFolderIcon(name, expanded)
    : resolveFileIcon(name);

  if (!iconId) {
    return null;
  }

  return loadIcon(iconId);
}

function resolveFileIcon(fileName: string): string | null {
  const exactMatch = theme.fileNames?.[fileName];

  if (exactMatch) {
    return exactMatch;
  }

  const extensionMatch = resolveExtension(fileName);

  if (extensionMatch) {
    return extensionMatch;
  }

  return theme.file ?? null;
}

function resolveFolderIcon(
  folderName: string,
  expanded: boolean,
): string | null {
  if (expanded) {
    const expandedMatch = theme.folderNamesExpanded?.[folderName];

    if (expandedMatch) {
      return expandedMatch;
    }

    if (theme.folderExpanded) {
      return theme.folderExpanded;
    }
  }

  return theme.folderNames?.[folderName] ?? theme.folder ?? null;
}

function resolveExtension(fileName: string): string | null {
  const parts = fileName.split(".");

  if (parts.length <= 1) {
    return null;
  }

  for (let index = 1; index < parts.length; index++) {
    const extension = parts.slice(index).join(".");
    const match = theme.fileExtensions?.[extension];

    if (match) {
      return match;
    }
  }

  return null;
}

function loadIcon(iconId: string): Promise<string | null> {
  const cached = iconUrlCache.get(iconId);

  if (cached) {
    return cached;
  }

  const definition = theme.iconDefinitions[iconId];

  if (!definition) {
    return Promise.resolve(null);
  }

  const fileName = getBaseName(definition.iconPath);

  const modulePath = `../../../node_modules/material-icon-theme/icons/${fileName}`;

  const loader = iconModules[modulePath];

  if (!loader) {
    console.warn(`[FileSystemIcon] Missing icon asset: ${modulePath}`);

    return Promise.resolve(null);
  }

  const promise = loader()
    .then((module) => module.default)
    .catch((error) => {
      console.error(`[FileSystemIcon] Failed to load ${fileName}:`, error);

      return null;
    });

  iconUrlCache.set(iconId, promise);

  return promise;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}

function getBaseName(path: string): string {
  return path.split("/").pop() ?? path;
}
