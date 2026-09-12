export type RepositorySelectionStatus = "checking" | "none" | "ready";

export interface RepositorySelectionState {
  status: RepositorySelectionStatus;
  root: string | null;
  error: string | null;
}

export interface RepositorySelectionAction {
  initialize: () => Promise<void>;
  selectRepository: (path: string) => Promise<void>;
  clearRepository: () => void;
}

export interface RepositoryHistoryState {
  repositories: string[];
}

export interface RepositoryHistoryAction {
  addEntry: (path: string) => void;
  clearEntries: () => void;
}
