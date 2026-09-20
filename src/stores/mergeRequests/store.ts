import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

import { useGitProvidersStore } from "../providers/store";
import { showAppNotification } from "../../components/NotificationCenter/helper";

import type { MergeRequestsStore, ProviderMergeRequest } from "./store.types";

export const useMergeRequestsStore = create<MergeRequestsStore>((set, get) => ({
  mergeRequests: [],
  selected: null,

  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    await get().refresh();

    set({
      initialized: true,
    });
  },

  refresh: async () => {
    if (get().loading) {
      return;
    }

    set({
      loading: true,
    });

    try {
      const providers = useGitProvidersStore.getState().providers;

      const results = await Promise.allSettled(
        providers.map(async (provider) => {
          return invoke<ProviderMergeRequest[]>("get_provider_merge_requests", {
            providerId: provider.id,
          });
        }),
      );

      const mergeRequests: ProviderMergeRequest[] = [];
      const errors: string[] = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          mergeRequests.push(...result.value);
        } else {
          errors.push(String(result.reason));
        }
      }

      mergeRequests.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      const selected = get().selected;

      const nextSelected = selected
        ? (mergeRequests.find(
            (request) =>
              request.providerId === selected.providerId &&
              request.id === selected.id,
          ) ?? null)
        : null;

      set({
        mergeRequests,
        selected: nextSelected,
      });

      if (errors.length > 0) {
        showAppNotification({
          type: "error",
          title: "Some Git providers could not be loaded",
          message: errors.join("\n"),
        });
      }
    } catch (error) {
      showAppNotification({
        type: "error",
        title: "Cannot load merge requests",
        message: `Reason: ${String(error)}`,
      });
    } finally {
      set({
        loading: false,
      });
    }
  },

  select: (request) => {
    set({
      selected: request,
    });
  },
}));
