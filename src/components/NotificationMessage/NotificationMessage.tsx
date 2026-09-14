import { Text } from "@mantine/core";
import type { NotificationMessageProps } from "./NotificationMessage.types";
import classes from "./NotificationMessage.module.css"

export default function NotificationMessage({
  message,
  format = "text",
  dimmed = false,
}: NotificationMessageProps) {
  return (
    <Text
      size="sm"
      c={dimmed ? "dimmed" : "var(--neyra-text-secondary)"}
      className={format === "code" ? classes.codeMessage : undefined}
    >
      {message}
    </Text>
  );
}
