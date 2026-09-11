import { Text, Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCircleCheck,
  IconExclamationCircle,
  IconLink,
} from "@tabler/icons-react";
import { useNotificationStore } from "./stores/notifications/store";
import { openUrl } from "@tauri-apps/plugin-opener";

export interface GitNotification {
  title: string;
  /** Raw git output, or an error thrown by `invoke` — both are stringified. */
  message: unknown;
}

export interface GitNotificationSuccess extends GitNotification {
  prUrl?: string;
}

/** Git output is multi-line and can be long, so keep its line breaks, wrap long
 *  paths, and scroll past the cap instead of growing the notification. */
function gitOutput(message: unknown, prUrl?: string) {
  return (
    <div>
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
      {prUrl ? (
        <Button
          radius="md"
          size="sm"
          variant="light"
          leftSection={<IconLink />}
          onClick={async () => {
            await openUrl(prUrl);
          }}
        >
          Create PR/MR
        </Button>
      ) : null}
    </div>
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

export function showSuccessNotification({
  title,
  message,
  prUrl,
}: GitNotificationSuccess) {
  useNotificationStore.getState().add({
    type: "success",
    title: title,
    message: String(message),
  });
  notifications.show({
    ...SHARED,

    title,
    autoClose: 5000,
    message: gitOutput(message, prUrl),
    color: "green",

    icon: <IconCircleCheck size={20} color="var(--neyra-success)" />,
  });
}

export function showErrorNotification({ title, message }: GitNotification) {
  console.error(`${title}:`, message);

  useNotificationStore.getState().add({
    type: "error",
    title: title,
    message: String(message),
  });
  notifications.show({
    ...SHARED,

    title,
    autoClose: 5000,
    message: gitOutput(message),
    color: "red",

    icon: <IconExclamationCircle size={20} color="var(--neyra-danger)" />,
  });
}

export const parseUrlFromCommitStatus = (msg: string) => {
  const urlLines = msg
    .split("\n")
    .filter((line) => line.includes("remote: ") && line.includes("https://"));

  if (urlLines.length == 0) {
    return;
  }
  const urlLine = urlLines[0];

  return urlLine.slice(urlLine.indexOf("https://")).trim();
};

export function buildQueryParams(params: Record<string, string>): string {
  const query = Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  return query ? `?${query}` : "";
}

export function formatNotificationTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
