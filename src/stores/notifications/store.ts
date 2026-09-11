import { create } from "zustand";
import {
  NotificationsStoreAction,
  NotificationsStoreState,
  NeyraNotification,
} from "./store.types";

export const useNotificationStore = create<
  NotificationsStoreState & NotificationsStoreAction
>((set) => ({
  items: [],

  add: (notification) => {
    const id = crypto.randomUUID();

    const item: NeyraNotification = {
      ...notification,
      id,
      createdAt: Date.now(),
      read: false,
    };

    set((state) => ({
      items: [item, ...state.items].slice(0, 100),
    }));

    return id;
  },

  remove: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  clear: () => set({ items: [] }),

  markRead: (id) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      items: state.items.map((item) => ({
        ...item,
        read: true,
      })),
    })),
}));
