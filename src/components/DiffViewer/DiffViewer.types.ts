export type DiffSource = "staged" | "unstaged";

export type DiffFileStatus =
  | "added"
  | "deleted"
  | "modified"
  | "renamed"
  | "copied"
  | "untracked"
  | "typeChanged"
  | "conflicted"
  | "unknown";

export type DiffLineKind = "context" | "addition" | "deletion";

export interface FileDiff {
  oldPath?: string;
  newPath?: string;
  status: DiffFileStatus;
  binary: boolean;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  kind: DiffLineKind;
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}
