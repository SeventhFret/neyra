import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'

export interface StatusEntry {
    /** Porcelain code for the index side, e.g. "M", "A", "?", " ". */
    indexStatus: string;
    /** Porcelain code for the worktree side. */
    worktreeStatus: string;
    path: string;
    /** Where the file came from, for renames and copies. */
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
    /** ISO 8601 */
    date: string;
    subject: string;
    body: string;
}

export interface Branch {
    /** Short name: `main` for a local branch, `origin/main` for a remote one. */
    name: string;
    isCurrent: boolean;
    isRemote: boolean;
    /** Which remote a remote branch belongs to. */
    remote: string | null;
    /** Upstream a local branch tracks, e.g. `origin/main`. */
    upstream: string | null;
    ahead: number;
    behind: number;
    /** Upstream is configured but no longer exists on the remote. */
    upstreamGone: boolean;
    shortHash: string;
    subject: string;
    /** ISO 8601 date of the branch tip. */
    date: string;
}

export interface RepoData {
    root: string;
    /** null means HEAD is detached */
    currentBranch: string | null;
    status: StatusEntry[];
    statusMessage: string;
    remotes: Remote[];
    branches: Branch[];
    commits: Commit[];
}

export interface GitRepoDataState extends RepoData {
    isLoading: boolean;
    error: string | null;
}

export interface GitRepoDataAction {
    setCurrentBranch: (currentBranch: string | null) => void;
    refresh: () => Promise<void>;
}

export const useRepoData = create<GitRepoDataState & GitRepoDataAction>((set) => ({
    root: "",
    currentBranch: null,
    status: [],
    statusMessage: "",
    remotes: [],
    branches: [],
    commits: [],
    isLoading: false,
    error: null,
    setCurrentBranch: (currentBranch) => { set({ currentBranch: currentBranch }) },
    refresh: async () => {
        set({ isLoading: true, error: null })
        try {
            const repoData = await invoke<RepoData>("get_repo_data")
            set({ ...repoData, isLoading: false })
        } catch (error) {
            set({ error: String(error), isLoading: false })
        }
    }
}))
