import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { buildQueryParams } from "./utils";
import { fetch } from "@tauri-apps/plugin-http";
import { listen } from "@tauri-apps/api/event";

const GITLAB_API_BASE_URL = "https://gitlab.com/api/v4/";
// const MR_QUERY = "merge_requests?state=opened&scope=created_by_me&created_after=2026-01-01T00:00:00Z&order_by=updated_at"

const MR_QUERIES = {
  state: "opened",
  scope: "created_by_me",
  updated_after: new Date(Date.now() - 180 * 864e5).toISOString(),
  per_page: "100",
  order_by: "updated_at",
};

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
  /** Branch/ref this commit belongs to, e.g. "main", "origin/develop" */
  refName: string | null;
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

/** GitLab User object */
export interface GitLabUser {
  id: number;
  username: string;
  public_email: string;
  name: string;
  state: string;
  locked: boolean;
  avatar_url: string;
  web_url: string;
}

/** Time tracking stats */
export interface TimeStats {
  time_estimate: number;
  total_time_spent: number;
  human_time_estimate: string | null;
  human_total_time_spent: string | null;
}

/** Task completion status */
export interface TaskCompletionStatus {
  count: number;
  completed_count: number;
}

/** MR References */
export interface MRReferences {
  short: string;
  relative: string;
  full: string;
}

/** GitLab Merge Request */
export interface GitLabMergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  merged_by: GitLabUser | null;
  merge_user: GitLabUser | null;
  merged_at: string | null;
  closed_by: GitLabUser | null;
  closed_at: string | null;
  target_branch: string;
  source_branch: string;
  user_notes_count: number;
  upvotes: number;
  downvotes: number;
  author: GitLabUser;
  assignees: GitLabUser[];
  assignee: GitLabUser | null;
  reviewers: GitLabUser[];
  source_project_id: number;
  target_project_id: number;
  labels: string[];
  draft: boolean;
  imported: boolean;
  imported_from: string;
  work_in_progress: boolean;
  milestone: null;
  merge_when_pipeline_succeeds: boolean;
  merge_status: string;
  detailed_merge_status: string;
  merge_after: null;
  sha: string;
  merge_commit_sha: string | null;
  squash_commit_sha: string | null;
  discussion_locked: null;
  should_remove_source_branch: null;
  force_remove_source_branch: boolean;
  prepared_at: string;
  reference: string;
  references: MRReferences;
  web_url: string;
  time_stats: TimeStats;
  squash: boolean;
  squash_on_merge: boolean;
  task_completion_status: TaskCompletionStatus;
  has_conflicts: boolean;
  blocking_discussions_resolved: boolean;
}

export interface PRDataState {
  glPullRequests: GitLabMergeRequest[];
  glSelectedPr: GitLabMergeRequest | null;
}

export interface PRDataAction {
  getGlPullRequests: () => void;
  selectGlPr: (pr: GitLabMergeRequest) => void;
}

let refreshRunning = false;
let refreshPending = false;
interface RepoChangedEvent {
  root: string;
}

export async function listenForRepoChanges() {
  return listen<RepoChangedEvent>("repo-changed", () => {
    void useRepoData.getState().refresh();
  });
}

export const useRepoData = create<GitRepoDataState & GitRepoDataAction>(
  (set) => ({
    root: "",
    currentBranch: null,
    status: [],
    statusMessage: "",
    remotes: [],
    branches: [],
    commits: [],

    isLoading: false,
    error: null,

    setCurrentBranch: (currentBranch) => {
      set({ currentBranch });
    },

    refresh: async () => {
      console.log("refreshing!");
      if (refreshRunning) {
        refreshPending = true;
        return;
      }

      refreshRunning = true;

      try {
        do {
          refreshPending = false;

          set({
            isLoading: true,
            error: null,
          });

          try {
            const repoData = await invoke<RepoData>("get_repo_data");

            set({
              ...repoData,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            set({
              error: String(error),
              isLoading: false,
            });
          }
        } while (refreshPending);
      } finally {
        refreshRunning = false;
      }
    },
  }),
);

export async function fetchMergeRequests() {
  const fullUrl =
    GITLAB_API_BASE_URL + "merge_requests" + buildQueryParams(MR_QUERIES);
  const res = await fetch(fullUrl, {
    headers: { "PRIVATE-TOKEN": import.meta.env.VITE_GITLAB_PERSONAL_TOKEN },
  });
  if (!res.ok) throw new Error(`GitLab ${res.status}: ${await res.text()}`);
  return res.json();
}

export const usePullRequestsData = create<PRDataState & PRDataAction>(
  (set) => ({
    glPullRequests: [],
    glSelectedPr: null,
    selectGlPr: (pr) => {
      set({ glSelectedPr: pr });
    },
    getGlPullRequests: async () => {
      fetchMergeRequests()
        .then((mrs) => set({ glPullRequests: mrs }))
        .catch((err) => console.log(err));
    },
  }),
);
