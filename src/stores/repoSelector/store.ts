import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import {
  RepositorySelectionAction,
  RepositorySelectionState,
  RepositoryHistoryState,
  RepositoryHistoryAction,
} from "./store.types";
import { useRepoData } from "../../stores";

export const useRepositorySelectionStore = create<
  RepositorySelectionState & RepositorySelectionAction
>((set) => ({
  status: "none",
  root: null,
  error: null,

  initialize: async () => {
    set({
      status: "checking",
      error: null,
    });

    try {
      const root = await invoke<string | null>("get_repository_root");

      if (!root) {
        set({
          status: "none",
          root: null,
        });

        return;
      }

      set({
        status: "ready",
        root,
      });

      await useRepoData.getState().refresh();
    } catch (error) {
      set({
        status: "none",
        root: null,
        error: String(error),
      });
    }
  },

  selectRepository: async (path) => {
    set({
      status: "checking",
      error: null,
    });

    try {
      console.log("SELECTING REPO");
      const root = await invoke<string>("select_repository", { path });

      await useRepoData.getState().refresh();

      set({
        status: "ready",
        root,
      });
    } catch (error) {
      set({
        status: "none",
        root: null,
        error: String(error),
      });

      throw error;
    }
  },

  clearRepository: () => {
    set({
      status: "none",
      root: null,
      error: null,
    });
  },
}));

export const useRepoHistoryStore = create<
  RepositoryHistoryState & RepositoryHistoryAction
>()(
  persist<RepositoryHistoryState & RepositoryHistoryAction>(
    (set, _) => ({
      repositories: [],
      addEntry: (path) => {
        set((state) => {
          if (state.repositories.includes(path)) {
            return state;
          }

          return {
            repositories: [path, ...state.repositories],
          };
        });
      },
      clearEntries: () => {
        set({ repositories: [] });
      },
    }),
    {
      name: "repo-history",
    },
  ),
);
