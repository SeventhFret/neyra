import {
  Button,
  Group,
  Modal,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconRocket, IconSparkles } from "@tabler/icons-react";
import { relaunch } from "@tauri-apps/plugin-process";
import { useState } from "react";

import { useUpdatesStore } from "../../stores/updates/store";

import classes from "./NeyraUpdatesModal.module.css";

interface NeyraUpdatesModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function NeyraUpdatesModal({
  opened,
  onClose,
}: NeyraUpdatesModalProps) {
  const update = useUpdatesStore((state) => state.update);
  const setUpdate = useUpdatesStore((state) => state.setUpdate);

  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!update || isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      await update.downloadAndInstall();

      setUpdate(null);

      await relaunch();
    } catch (error) {
      console.error("Failed to install Neyra update:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!update) {
    return null;
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      radius="xl"
      size="lg"
      withCloseButton={false}
      classNames={{
        content: classes.modal,
        body: classes.body,
      }}
    >
      <div className={classes.background}>
        <span className={`${classes.star} ${classes.star1}`}>✦</span>
        <span className={`${classes.star} ${classes.star2}`}>✧</span>
        <span className={`${classes.star} ${classes.star3}`}>✦</span>
        <span className={`${classes.star} ${classes.star4}`}>·</span>
        <span className={`${classes.star} ${classes.star5}`}>✧</span>
      </div>

      <Stack className={classes.content} gap="lg">
        <Stack align="center" gap="xs">
          <ThemeIcon
            size={54}
            radius="xl"
            variant="light"
            color="neyraBlue"
            className={classes.updateIcon}
          >
            <IconRocket size={28} stroke={1.6} />
          </ThemeIcon>

          <Group gap={7}>
            <IconSparkles size={17} stroke={1.7} color="var(--neyra-primary)" />

            <Title order={2}>Neyra {update.version}</Title>
          </Group>

          <Text c="dimmed">A new version of Neyra is available.</Text>

          <Text size="xs" c="dimmed">
            {update.currentVersion} → {update.version}
          </Text>
        </Stack>

        {update.body && (
          <div className={classes.releaseNotes}>
            <Text fw={600} size="sm" mb="xs">
              What's new
            </Text>

            <Text
              size="sm"
              c="var(--neyra-text-secondary)"
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {update.body}
            </Text>
          </div>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} disabled={isUpdating}>
            Later
          </Button>

          <Button
            variant="light"
            leftSection={<IconRocket size={17} stroke={1.7} />}
            loading={isUpdating}
            onClick={() => handleUpdate()}
          >
            Update Neyra
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
