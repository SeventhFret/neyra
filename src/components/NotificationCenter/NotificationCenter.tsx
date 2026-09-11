import {
  Button,
  Drawer,
  Group,
  Notification,
  Stack,
  Text,
} from "@mantine/core";
import { IconCircleCheck, IconExclamationCircle } from "@tabler/icons-react";

import { useNotificationStore } from "../../stores/notifications/store";
import { formatNotificationTime } from "../../utils";

import classes from "./NotificationCenter.module.css";

interface NotificationCenterProps {
  opened: boolean;
  onClose: () => void;
}

export function NotificationCenter({
  opened,
  onClose,
}: NotificationCenterProps) {
  const items = useNotificationStore((state) => state.items);
  const remove = useNotificationStore((state) => state.remove);
  const clear = useNotificationStore((state) => state.clear);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);

  const unreadCount = items.filter((item) => !item.read).length;

  return (
    <Drawer
      radius="lg"
      offset={10}
      position="right"
      title="Notifications"
      opened={opened}
      onClose={onClose}
    >
      <Stack gap="md">
        {items.length > 0 && (
          <Group justify="space-between" gap="xs">
            <Button
              variant="subtle"
              size="xs"
              disabled={unreadCount === 0}
              onClick={markAllRead}
            >
              Mark all read
            </Button>

            <Button variant="subtle" color="red" size="xs" onClick={clear}>
              Clear all
            </Button>
          </Group>
        )}

        {items.length === 0 ? (
          <Stack align="center" py="xl" gap={4}>
            <Text c="dimmed">No notifications</Text>

            <Text size="xs" c="dimmed">
              Git activity will appear here.
            </Text>
          </Stack>
        ) : (
          <Stack gap="sm">
            {items.map((notification) => {
              const icon =
                notification.type === "success" ? (
                  <IconCircleCheck size={22} color="var(--neyra-success)" />
                ) : (
                  <IconExclamationCircle
                    size={22}
                    color="var(--neyra-danger)"
                  />
                );

              return (
                <Notification
                  key={notification.id}
                  className={notification.read ? classes.read : classes.unread}
                  onClick={() => {
                    if (!notification.read) {
                      markRead(notification.id);
                    }
                  }}
                  onClose={() => remove(notification.id)}
                  icon={icon}
                  title={
                    <Group gap="xs" wrap="nowrap">
                      <Text fw={notification.read ? 500 : 650} size="sm">
                        {notification.title}
                      </Text>

                      {!notification.read && (
                        <span className={classes.unreadDot} />
                      )}
                    </Group>
                  }
                >
                  <Stack gap={4}>
                    <Text
                      size="sm"
                      c={
                        notification.read
                          ? "dimmed"
                          : "var(--neyra-text-secondary)"
                      }
                    >
                      {notification.message}
                    </Text>

                    <Text size="xs" c="dimmed">
                      {formatNotificationTime(notification.createdAt)}
                    </Text>
                  </Stack>
                </Notification>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Drawer>
  );
}
