export type NeyraNotificationType = "success" | "error" | "info" | "warning";

export type NeyraNotification = {
  id: string;
  type: NeyraNotificationType;
  title: string;
  message?: string;
  createdAt: number;
  read: boolean;
};

export interface NotificationsStoreState {
  items: NeyraNotification[];
}

export interface NotificationsStoreAction {
  add: (
    notification: Omit<NeyraNotification, "id" | "createdAt" | "read">,
  ) => string;
  remove: (id: string) => void;
  clear: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}
