export interface FormatRelativeTimeOptions {
  showSeconds?: boolean;
  justNowThreshold?: number;
  absoluteAfterDays?: number;
  includeTimeInAbsolute?: boolean;
}

export function formatRelativeTime(
  value: string | number | Date,
  {
    showSeconds = false,
    justNowThreshold = 60,
    absoluteAfterDays = 30,
    includeTimeInAbsolute = false,
  }: FormatRelativeTimeOptions = {},
): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < justNowThreshold) {
    return "just now";
  }

  if (showSeconds && seconds < 60) {
    return `${seconds}s ago`;
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < absoluteAfterDays) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat(
    undefined,
    includeTimeInAbsolute
      ? {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
  ).format(date);
}
