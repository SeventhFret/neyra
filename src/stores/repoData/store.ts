import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";

import type {
  RepoChangedEvent,
  RepoData,
  RepoDataStoreData,
  RepoDataStoreAction,
} from "./store.types";

let refreshRunning = false;
let refreshPending = false;

export const useRepoDataStore = create<RepoDataStoreData & RepoDataStoreAction>(
  (set) => ({
    root: "",
    currentBranch: null,

    status: [],
    statusMessage: "",

    upstream: null,
    remotes: [],
    branches: [],
    commits: [],

    isLoading: false,
    error: null,

    setCurrentBranch: (currentBranch) => {
      set({ currentBranch });
    },

    refresh: async () => {
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

export async function listenForRepoChanges() {
  return listen<RepoChangedEvent>("repo-changed", () => {
    void useRepoDataStore.getState().refresh();
  });
}
