import { Button, Checkbox, Group, Stack, Text, TextInput } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useHotkeys } from "@mantine/hooks";
import {
  showErrorNotification,
  showSuccessNotification,
} from "../../../../utils";
import ShortcutKeys from "../../../../components/ShortcutKeys/ShortcutKeys";

export default function GitConfig() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isGlobal, setIsGlobal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // `--global` reads a different file, so the fields are refetched whenever the
  // scope flips rather than showing values from the other config.
  useEffect(() => {
    let isCurrent = true;

    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const [userName, userEmail] = await Promise.all([
          invoke<string | null>("get_config", {
            name: "user.name",
            global: isGlobal,
          }),
          invoke<string | null>("get_config", {
            name: "user.email",
            global: isGlobal,
          }),
        ]);

        // A scope switched again while this was in flight would otherwise
        // overwrite the newer values with these.
        if (!isCurrent) {
          return;
        }

        setName(userName ?? "");
        setEmail(userEmail ?? "");
      } catch (error) {
        showErrorNotification({
          title: "Failed to read the git config",
          message: error,
        });
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      isCurrent = false;
    };
  }, [isGlobal]);

  // Both values are blank until the first read lands, and writing an empty one
  // leaves an empty entry in the config, which is worse than none at all.
  const canSave =
    !isLoading &&
    !isSaving &&
    name.trim().length > 0 &&
    email.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    try {
      // One after the other: both writes touch the same config file, and git
      // takes a lock on it.
      await invoke("set_config", {
        name: "user.name",
        value: name.trim(),
        global: isGlobal,
      });
      await invoke("set_config", {
        name: "user.email",
        value: email.trim(),
        global: isGlobal,
      });

      // `git config` prints nothing on success, so the notification reports
      // what was written instead.
      showSuccessNotification({
        title: `Saved to the ${isGlobal ? "global" : "repository"} config`,
        message: `user.name=${name.trim()}\nuser.email=${email.trim()}`,
      });
    } catch (error) {
      showErrorNotification({
        title: "Failed to save the git config",
        message: error,
      });
    } finally {
      setIsSaving(false);
    }
  };

  useHotkeys(
    [
      ["ctrl+G", () => setIsGlobal((state) => !state)],
      ["ctrl+S", handleSave],
    ],
    [],
  );

  return (
    <Stack gap="md">
      <Stack gap={2}>
        <Text fw={600} size="lg">
          Git configuration
        </Text>

        <Text c="dimmed" size="sm">
          Configure the Git identity used for this repository.
        </Text>
      </Stack>
      <Stack w="100%" maw="450px">
        <TextInput
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          description={
            <Text c="dimmed" ff="Fira code, monospace" size="xs">
              git config{isGlobal ? " --global" : ""} user.name
            </Text>
          }
        />

        <TextInput
          label="E-Mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          description={
            <Text c="dimmed" ff="Fira code, monospace" size="xs">
              git config{isGlobal ? " --global" : ""} user.email
            </Text>
          }
        />
        <Checkbox
          checked={isGlobal}
          onChange={(event) => setIsGlobal(event.currentTarget.checked)}
          label={
            <Group gap="xs">
              Use
              <code style={{ fontWeight: 600 }}>--global</code>
              flag
              <ShortcutKeys shortcut={{ modifiers: ["mod"], key: "G" }} />
            </Group>
          }
        />
        <Group>
          <Button
            radius="lg"
            size="md"
            variant="filled"
            leftSection={<IconDeviceFloppy />}
            loading={isSaving}
            disabled={!canSave}
            onClick={handleSave}
          >
            Save config
          </Button>
          <ShortcutKeys shortcut={{ modifiers: ["mod"], key: "S" }} />
        </Group>
      </Stack>
    </Stack>
  );
}
