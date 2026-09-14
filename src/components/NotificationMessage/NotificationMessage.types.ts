import { NotificationMessageFormat } from "../../stores/notifications/store.types";

export interface NotificationMessageProps {
  message: string;
  format?: NotificationMessageFormat;
  dimmed?: boolean;
}
