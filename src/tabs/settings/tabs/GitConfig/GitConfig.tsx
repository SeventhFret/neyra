import { Button, Checkbox, Group, Stack, Text, TextInput } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useHotkeys } from "@mantine/hooks";
import { showAppNotification } from "../../../../components/NotificationCenter/helper";
import ShortcutKeys from "../../../../components/ShortcutKeys/ShortcutKeys";

export default function GitConfig() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isGlobal, setIsGlobal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

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

        if (!isCurrent) {
          return;
        }

        setName(userName ?? "");
        setEmail(userEmail ?? "");
      } catch (error) {
        showAppNotification({
          type: "error",
          title: "Failed to read the git config",
          message: error,
          messageFormat: "code",
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

      showAppNotification({
        type: "success",
        title: `Saved to the ${isGlobal ? "global" : "repository"} config`,
        message: `user.name=${name.trim()}\nuser.email=${email.trim()}`,
        messageFormat: "code",
      });
    } catch (error) {
      showAppNotification({
        type: "error",
        title: "Failed to save the git config",
        message: error,
        messageFormat: "code",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useHotkeys(
    [
      [
        "mod+alt+G",
        () => setIsGlobal((state) => !state),
        { usePhysicalKeys: true },
      ],
      ["mod+S", handleSave, { usePhysicalKeys: true }],
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
              <ShortcutKeys
                shortcut={{ modifiers: ["mod", "alt"], key: "G" }}
              />
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
