import {
  Button,
  Drawer,
  Group,
  Notification,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconCircleCheck,
  IconExclamationCircle,
  IconInfoCircle,
  IconRocket,
  IconAlertTriangle,
} from "@tabler/icons-react";

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

  console.log(items);

  return (
    <Drawer
      radius="lg"
      offset={10}
      size="lg"
      position="right"
      title="Notifications"
      opened={opened}
      onClose={onClose}
      classNames={{
        content: classes.drawerContent,
        body: classes.drawerBody,
      }}
    >
      <Stack gap="md" h="100%" className={classes.drawerStack}>
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
          <ScrollArea
            type="hover"
            className={classes.notificationList}
            classNames={{
              viewport: classes.notificationViewport,
              scrollbar: classes.scrollbar,
              thumb: classes.scrollbarThumb,
            }}
            offsetScrollbars
            scrollbarSize={6}
          >
            <Stack gap="sm" className={classes.notificationContent}>
              {items.map((notification) => {
                const icon = {
                  success: (
                    <IconCircleCheck size={22} color="var(--neyra-success)" />
                  ),
                  error: (
                    <IconExclamationCircle
                      size={22}
                      color="var(--neyra-danger)"
                    />
                  ),
                  warning: (
                    <IconAlertTriangle size={22} color="var(--neyra-warning)" />
                  ),
                  info: <IconInfoCircle size={22} color="var(--neyra-info)" />,
                  update: <IconRocket size={22} color="var(--neyra-primary)" />,
                }[notification.type];

                return (
                  <Notification
                    key={notification.id}
                    className={`${classes.notification} ${
                      notification.read ? classes.read : classes.unread
                    }`}
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
                    <Stack gap={2}>
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

                      <Group
                        w="100%"
                        justify="space-between"
                        align="center"
                        mt={4}
                      >
                        <Text size="xs" c="dimmed">
                          {formatNotificationTime(notification.createdAt)}
                        </Text>
                        {notification.actions &&
                        notification?.actions?.length > 0
                          ? notification.actions?.map((action) => {
                              const ActionIcon = action?.icon;

                              return (
                                <Button
                                  size="xs"
                                  variant="light"
                                  loading={action?.loading ?? false}
                                  className={
                                    action.destructive
                                      ? classes.destructiveAction
                                      : undefined
                                  }
                                  leftSection={
                                    ActionIcon ? (
                                      <ActionIcon size={15} stroke={1.7} />
                                    ) : null
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action?.onClick();
                                  }}
                                >
                                  {action.label}
                                </Button>
                              );
                            })
                          : null}
                      </Group>
                    </Stack>
                  </Notification>
                );
              })}
            </Stack>
          </ScrollArea>
        )}
      </Stack>
    </Drawer>
  );
}
