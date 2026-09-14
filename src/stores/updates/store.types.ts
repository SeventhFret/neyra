import { Update } from "@tauri-apps/plugin-updater";

export interface UpdatesStoreState {
  update: Update | null;
}

export interface UpdatesStoreAction {
  setUpdate: (update: Update | null) => void;
}
