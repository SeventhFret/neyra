export type GitProviderType = "github" | "gitlab";

export interface GitProvider {
  id: string;
  providerType: GitProviderType;
  host: string;
  username?: string | null;
}

export interface GitProvidersStoreState {
  providers: GitProvider[];
}

export interface GitProvidersStoreAction {
  initialize: () => Promise<void>;

  add: (provider: GitProvider, token: string) => Promise<void>;

  update: (
    originalId: string,
    provider: GitProvider,
    token?: string,
  ) => Promise<void>;

  remove: (id: string) => Promise<void>;

  getById: (id: string) => GitProvider | undefined;
}
