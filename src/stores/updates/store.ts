import { create } from "zustand";
import { UpdatesStoreState, UpdatesStoreAction } from "./store.types";

export const useUpdatesStore = create<UpdatesStoreState & UpdatesStoreAction>(
  (set) => ({
    update: null,
    setUpdate: (update) => {
      set({ update: update });
    },
  }),
);
