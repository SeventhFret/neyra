import type { Icon } from "@tabler/icons-react";

export type NeyraNotificationType = "success" | "error" | "info" | "warning" | "update";

export interface NeyraNotificationAction {
  label: string;
  icon?: Icon;
  onClick: () => void | Promise<void>;
  loading?: boolean;
  destructive?: boolean;
}

export type NeyraNotification = {
  id: string;
  type: NeyraNotificationType;
  title: string;
  message?: string;
  createdAt: number;
  read: boolean;

  actions?: NeyraNotificationAction[];
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
