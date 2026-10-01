export interface IconDefinition {
  iconPath: string;
}

export interface MaterialIconManifest {
  iconDefinitions: Record<string, IconDefinition>;

  file?: string;
  folder?: string;
  folderExpanded?: string;

  fileExtensions?: Record<string, string>;
  fileNames?: Record<string, string>;

  folderNames?: Record<string, string>;
  folderNamesExpanded?: Record<string, string>;

  languageIds?: Record<string, string>;
}

export type IconModule = {
  default: string;
};

export interface FileSystemIconProps {
  path: string;
  directory?: boolean;
  expanded?: boolean;
  size?: number;
  className?: string;
}
