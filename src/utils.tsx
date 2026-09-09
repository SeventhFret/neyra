import { Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCircleCheck, IconExclamationCircle } from "@tabler/icons-react";

export interface GitNotification {
  title: string;
  /** Raw git output, or an error thrown by `invoke` — both are stringified. */
  message: unknown;
}

/** Git output is multi-line and can be long, so keep its line breaks, wrap long
 *  paths, and scroll past the cap instead of growing the notification. */
function gitOutput(message: unknown) {
  return (
    <Text
      size="sm"
      ff="monospace"
      style={{
        maxHeight: "220px",
        overflowY: "auto",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
    >
      {String(message)}
    </Text>
  );
}

/** Shared shape for both variants: the notification centers its children and
 *  hides overflow, which clips the title and both ends of a tall message, so
 *  everything is aligned to the top instead. */
const SHARED = {
  autoClose: false,
  withBorder: true,
  radius: "lg",
  color: "primary",
  styles: {
    root: { alignItems: "flex-start" },
    icon: { marginTop: "2px" },
  },
} as const;

/** Short relative age, e.g. `5m ago`. Falls back to a plain date past a month. */
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

export function showSuccessNotification({ title, message }: GitNotification) {
  notifications.show({
    ...SHARED,
    title,
    message: gitOutput(message),
    icon: <IconCircleCheck color="#37b24d" />,
  });
}

export function showErrorNotification({ title, message }: GitNotification) {
  console.error(`${title}:`, message);

  notifications.show({
    ...SHARED,
    title,
    message: gitOutput(message),
    icon: <IconExclamationCircle color="#f03e3e" />,
  });
}
