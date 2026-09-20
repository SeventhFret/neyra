import type { GitProviderType } from "../providers/store.types";

export type MergeRequestState = "open" | "closed" | "merged";

export type MergeStatus =
  | "mergeable"
  | "conflicts"
  | "checking"
  | "blocked"
  | "unknown";

export interface ProviderUser {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
}

export interface MergeRequest {
  id: number;
  number: number;

  title: string;
  description: string | null;
  url: string;

  sourceBranch: string;
  targetBranch: string;

  author: ProviderUser;
  reviewers: ProviderUser[];

  draft: boolean;
  state: MergeRequestState;
  mergeStatus: MergeStatus;

  createdAt: string;
  updatedAt: string;
}

/**
 * Frontend representation of a request with information about
 * the provider/repository it originated from.
 */
export interface ProviderMergeRequest extends MergeRequest {
  providerId: string;
  providerType: GitProviderType;
  repository: string;
}

export interface MergeRequestsStoreState {
  mergeRequests: ProviderMergeRequest[];
  selected: ProviderMergeRequest | null;

  loading: boolean;
  initialized: boolean;
}

export interface MergeRequestsStoreActions {
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;

  select: (request: ProviderMergeRequest | null) => void;
}

export type MergeRequestsStore = MergeRequestsStoreState &
  MergeRequestsStoreActions;
