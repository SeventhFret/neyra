import type {
  NeyraNotificationAction,
  NeyraNotificationType,
  NotificationMessageFormat,
} from "../../stores/notifications/store.types";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconExclamationCircle,
  IconInfoCircle,
  IconRocket,
} from "@tabler/icons-react";

export const notificationMeta = {
  success: {
    icon: IconCircleCheck,
    color: "var(--neyra-success)",
    mantineColor: "green",
  },

  error: {
    icon: IconExclamationCircle,
    color: "var(--neyra-danger)",
    mantineColor: "red",
  },

  warning: {
    icon: IconAlertTriangle,
    color: "var(--neyra-warning)",
    mantineColor: "yellow",
  },

  info: {
    icon: IconInfoCircle,
    color: "var(--neyra-info)",
    mantineColor: "blue",
  },

  update: {
    icon: IconRocket,
    color: "var(--neyra-primary)",
    mantineColor: "neyraBlue",
  },
} satisfies Record<
  NeyraNotificationType,
  {
    icon: typeof IconCircleCheck;
    color: string;
    mantineColor: string;
  }
>;

export interface AppNotificationInput {
  type: NeyraNotificationType;
  title: string;
  message: unknown;
  messageFormat?: NotificationMessageFormat;
  actions?: NeyraNotificationAction[];
  autoClose?: number | false;
}
