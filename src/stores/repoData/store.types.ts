export interface StatusEntry {
  /**
   * Porcelain code for the index side.
   * For example: "M", "A", "?", " ".
   */
  indexStatus: string;

  /**
   * Porcelain code for the worktree side.
   */
  worktreeStatus: string;

  path: string;

  /**
   * Original path for renames and copies.
   */
  originalPath: string | null;
}

export interface Remote {
  name: string;
  fetchUrl: string | null;
  pushUrl: string | null;
}

export interface Commit {
  hash: string;
  shortHash: string;

  authorName: string;
  authorEmail: string;

  /**
   * ISO 8601 date.
   */
  date: string;

  subject: string;
  body: string;

  /**
   * Branch/ref this commit belongs to.
   * For example: "main" or "origin/develop".
   */
  refName: string | null;
}

export interface Branch {
  /**
   * Short branch name.
   * For example: "main" or "origin/main".
   */
  name: string;

  isCurrent: boolean;
  isRemote: boolean;

  /**
   * Remote a remote branch belongs to.
   */
  remote: string | null;

  /**
   * Upstream tracked by a local branch.
   * For example: "origin/main".
   */
  upstream: string | null;

  ahead: number;
  behind: number;

  /**
   * Upstream is configured but no longer exists.
   */
  upstreamGone: boolean;

  shortHash: string;
  subject: string;

  /**
   * ISO 8601 date of the branch tip.
   */
  date: string;
}

export interface RepoData {
  root: string;

  /**
   * null means HEAD is detached.
   */
  currentBranch: string | null;

  status: StatusEntry[];
  statusMessage: string;

  remotes: Remote[];
  branches: Branch[];
  commits: Commit[];
}

export interface RepoDataStoreData extends RepoData {
  isLoading: boolean;
  error: string | null;
}

export interface RepoDataStoreAction {
  setCurrentBranch: (currentBranch: string | null) => void;

  refresh: () => Promise<void>;
}

export interface RepoChangedEvent {
  root: string;
}
