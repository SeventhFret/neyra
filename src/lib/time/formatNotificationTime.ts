import { formatRelativeTime } from "./formatRelativeTime";

export function formatNotificationTime(timestamp: number): string {
  return formatRelativeTime(timestamp, {
    showSeconds: true,
    justNowThreshold: 10,
    absoluteAfterDays: 7,
    includeTimeInAbsolute: true,
  });
}
