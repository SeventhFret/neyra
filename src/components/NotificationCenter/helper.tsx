import { useNotificationStore } from "../../stores/notifications/store";
import { notifications } from "@mantine/notifications";
import {
  AppNotificationInput,
  notificationMeta,
} from "./NotificationCenter.types";
import NotificationMessage from "../NotificationMessage/NotificationMessage";
import { Stack, Group, Button } from "@mantine/core";

const MANTINE_NOTIFICATION_PROPS = {
  autoClose: false,
  withBorder: true,
  radius: "lg",
  color: "primary",
  styles: {
    root: { alignItems: "flex-start" },
    icon: { marginTop: "2px" },
  },
} as const;

export function showAppNotification({
  type,
  title,
  message,
  messageFormat = "text",
  actions,
  autoClose = 5000,
}: AppNotificationInput) {
  const text = String(message);

  useNotificationStore.getState().add({
    type,
    title,
    message: text,
    messageFormat,
    actions,
  });

  const meta = notificationMeta[type];
  const Icon = meta.icon;

  notifications.show({
    ...MANTINE_NOTIFICATION_PROPS,
    title,
    autoClose,
    color: meta.mantineColor,

    icon: <Icon size={20} color={meta.color} />,

    message: (
      <Stack gap="xs">
        <NotificationMessage message={text} format={messageFormat} />

        {actions && actions.length > 0 && (
          <Group justify="flex-end" gap="xs">
            {actions.map((action) => {
              const ActionIcon = action.icon;

              return (
                <Button
                  key={action.label}
                  size="xs"
                  variant="light"
                  loading={action.loading ?? false}
                  leftSection={
                    ActionIcon ? (
                      <ActionIcon size={15} stroke={1.7} />
                    ) : undefined
                  }
                  onClick={() => {
                    void action.onClick();
                  }}
                >
                  {action.label}
                </Button>
              );
            })}
          </Group>
        )}
      </Stack>
    ),
  });
}
