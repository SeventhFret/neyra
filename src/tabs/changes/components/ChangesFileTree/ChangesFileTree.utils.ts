import type { TreeNodeData } from "@mantine/core";
import type { StatusEntry } from "../../../../stores/repoData/store.types";
import type { DiffSource } from "../../../../components/DiffViewer/DiffViewer.types";

export const STATUS_COLORS = {
  conflicted: "#da77f2",
  deleted: "#ff6b6b",
  added: "#51cf66",
  renamed: "#4dabf7",
  modified: "#ffd43b",
  untracked: "#a1a1aa",
} as const;

export type StatusKind = keyof typeof STATUS_COLORS;

export interface ChangesFileSelection {
  entry: StatusEntry;
  source: DiffSource;
}

export interface NodeMeta {
  isDir: boolean;
  status: StatusKind | null;
  entry: StatusEntry | null;
}

interface RawNode {
  name: string;
  path: string;
  children: Map<string, RawNode>;
  entry?: StatusEntry;
}

export function hasStagedChange(entry: StatusEntry): boolean {
  return entry.indexStatus !== " " && entry.indexStatus !== "?";
}

export function hasUnstagedChange(entry: StatusEntry): boolean {
  return entry.worktreeStatus !== " ";
}

export function statusKind(entry: StatusEntry, source: DiffSource): StatusKind {
  const code = source === "staged" ? entry.indexStatus : entry.worktreeStatus;

  if (code === "U") return "conflicted";
  if (code === "D") return "deleted";
  if (code === "A") return "added";
  if (code === "R" || code === "C") return "renamed";
  if (code === "M") return "modified";

  return "untracked";
}

function compareNodes(a: RawNode, b: RawNode): number {
  const aIsDir = a.children.size > 0;
  const bIsDir = b.children.size > 0;

  if (aIsDir !== bIsDir) {
    return aIsDir ? -1 : 1;
  }

  return a.name.localeCompare(b.name);
}

export function buildChangesTree(
  entries: StatusEntry[],
  source: DiffSource,
): {
  data: TreeNodeData[];
  meta: Map<string, NodeMeta>;
} {
  const root: RawNode = {
    name: "",
    path: "",
    children: new Map(),
  };

  for (const entry of entries) {
    const segments = entry.path.replace(/\/+$/, "").split("/");

    let node = root;

    segments.forEach((segment, index) => {
      let child = node.children.get(segment);

      if (!child) {
        child = {
          name: segment,
          path: segments.slice(0, index + 1).join("/"),
          children: new Map(),
        };

        node.children.set(segment, child);
      }

      if (index === segments.length - 1) {
        child.entry = entry;
      }

      node = child;
    });
  }

  const meta = new Map<string, NodeMeta>();

  const convert = (node: RawNode): TreeNodeData => {
    const children = [...node.children.values()]
      .sort(compareNodes)
      .map(convert);

    const isDir = children.length > 0;

    meta.set(node.path, {
      isDir,
      status: node.entry ? statusKind(node.entry, source) : null,
      entry: node.entry ?? null,
    });

    return {
      value: node.path,
      label: node.name,
      children: isDir ? children : undefined,
    };
  };

  return {
    data: [...root.children.values()].sort(compareNodes).map(convert),
    meta,
  };
}
