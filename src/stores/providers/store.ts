import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

import {
  GitProvidersStoreState,
  GitProvidersStoreAction,
  GitProvider,
} from "./store.types";
import { showAppNotification } from "../../components/NotificationCenter/helper";

export const useGitProvidersStore = create<
  GitProvidersStoreState & GitProvidersStoreAction
>((set, get) => ({
  providers: [],

  initialize: async () => {
    try {
      const providers = await invoke<GitProvider[]>(
        "get_providers_from_config",
      );

      set({ providers });
    } catch (error) {
      showAppNotification({
        type: "error",
        title: "Cannot load Git providers",
        message: String(error),
        messageFormat: "code",
      });
    }
  },

  add: async (provider, token) => {
    await invoke("add_provider", {
      provider,
      token,
    });

    set({
      providers: [...get().providers, provider],
    });
  },

  remove: async (id) => {
    await invoke("remove_provider", { id });

    set({
      providers: get().providers.filter((provider) => provider.id !== id),
    });
  },

  getById: (id) => {
    return get().providers.find((provider) => provider.id === id);
  },
  update: async (_originalId, _provider, _token) => {},
}));
