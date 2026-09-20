import {
  Accordion,
  Badge,
  Button,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import type { TablerIcon } from "@tabler/icons-react";
import {
  IconDeviceFloppy,
  IconPlus,
  IconServer,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

import { TEXT_INPUT_ADDITIONAL_PROPS } from "../../../../lib/constants/input";
import { showAppNotification } from "../../../../components/NotificationCenter/helper";
import { useGitProvidersStore } from "../../../../stores/providers/store";
import type {
  GitProvider,
  GitProviderType,
} from "../../../../stores/providers/store.types";
import classes from "./GitProviderConfiguration.module.css";

interface GitProviderConfigurationProps {
  type: GitProviderType;
  name: string;
  icon: TablerIcon;

  defaultHost: string;

  tokenPlaceholder?: string;
}

export default function GitProviderConfiguration({
  type,
  name,
  icon: ProviderIcon,
  defaultHost,
  tokenPlaceholder,
}: GitProviderConfigurationProps) {
  const providers = useGitProvidersStore((state) => state.providers);
  const addProvider = useGitProvidersStore((state) => state.add);
  const updateProvider = useGitProvidersStore((state) => state.update);
  const removeProvider = useGitProvidersStore((state) => state.remove);

  const [adding, setAdding] = useState(false);

  const matchingProviders = providers.filter(
    (provider) => provider.providerType === type,
  );

  return (
    <Stack gap="md">
      {matchingProviders.length > 0 && (
        <Paper
          radius="xl"
          p="xs"
          bg="var(--neyra-surface-2)"
          style={{
            border: "1px solid var(--neyra-border-soft)",
          }}
        >
          <Accordion
            variant="unstyled"
            className={classes.accordion}
            classNames={{
              item: classes.item,
              control: classes.control,
              label: classes.label,
              chevron: classes.chevron,
              panel: classes.panel,
              content: classes.content,
            }}
          >
            {matchingProviders.map((provider) => (
              <Accordion.Item key={provider.id} value={provider.id}>
                <Accordion.Control>
                  <ProviderHeader
                    provider={provider}
                    defaultHost={defaultHost}
                    icon={ProviderIcon}
                  />
                </Accordion.Control>

                <Accordion.Panel>
                  <ProviderForm
                    mode="edit"
                    provider={provider}
                    type={type}
                    name={name}
                    defaultHost={defaultHost}
                    tokenPlaceholder={tokenPlaceholder}
                    onSave={async (nextProvider, token) => {
                      await updateProvider(
                        provider.id,
                        nextProvider,
                        token || undefined,
                      );
                    }}
                    onRemove={async () => {
                      await removeProvider(provider.id);
                    }}
                  />
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Paper>
      )}

      {matchingProviders.length === 0 && !adding && (
        <EmptyState name={name} icon={ProviderIcon} />
      )}

      {adding && (
        <Paper
          radius="xl"
          p="lg"
          bg="var(--neyra-surface-2)"
          style={{
            border: "1px solid var(--neyra-border-soft)",
          }}
        >
          <ProviderForm
            mode="add"
            type={type}
            name={name}
            defaultHost={defaultHost}
            tokenPlaceholder={tokenPlaceholder}
            onSave={async (provider, token) => {
              if (!token) {
                throw new Error("A personal access token is required");
              }

              await addProvider(provider, token);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </Paper>
      )}

      {!adding && (
        <Group>
          <Button
            radius="lg"
            variant="light"
            leftSection={<IconPlus size={17} />}
            onClick={() => setAdding(true)}
          >
            Add {name} provider
          </Button>
        </Group>
      )}
    </Stack>
  );
}

// HEADER

interface ProviderHeaderProps {
  provider: GitProvider;
  defaultHost: string;
  icon: TablerIcon;
}

function ProviderHeader({
  provider,
  defaultHost,
  icon: ProviderIcon,
}: ProviderHeaderProps) {
  let hostname = provider.host;

  try {
    hostname = new URL(provider.host).hostname;
  } catch {
    // Display the configured value as-is.
  }

  return (
    <Group justify="space-between" wrap="nowrap" pr="sm">
      <Group gap="sm" wrap="nowrap">
        <ProviderIcon size={20} stroke={1.7} color="var(--neyra-primary)" />

        <Stack gap={0}>
          <Text fw={600} size="sm">
            {provider.id}
          </Text>

          <Text size="xs" c="dimmed">
            {hostname}
          </Text>
        </Stack>
      </Group>

      {provider.host === defaultHost ? (
        <Badge variant="light" size="sm">
          Cloud
        </Badge>
      ) : (
        <Badge
          variant="light"
          color="gray"
          size="sm"
          leftSection={<IconServer size={11} />}
        >
          Self-hosted
        </Badge>
      )}
    </Group>
  );
}

// PROVIDER FORM

interface ProviderFormProps {
  mode: "add" | "edit";

  type: GitProviderType;
  name: string;
  defaultHost: string;

  provider?: GitProvider;

  tokenPlaceholder?: string;

  onSave: (provider: GitProvider, token: string) => Promise<void>;

  onRemove?: () => Promise<void>;
  onCancel?: () => void;
}

function ProviderForm({
  mode,
  type,
  name,
  defaultHost,
  provider,
  tokenPlaceholder,
  onSave,
  onRemove,
  onCancel,
}: ProviderFormProps) {
  const providers = useGitProvidersStore((state) => state.providers);

  const [id, setId] = useState(provider?.id ?? "");
  const [host, setHost] = useState(provider?.host ?? defaultHost);
  const [username, setUsername] = useState(provider?.username ?? "");
  const [token, setToken] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const normalizedId = id.trim();
  const normalizedHost = host.trim().replace(/\/+$/, "");

  const idAlreadyExists = providers.some(
    (existing) => existing.id === normalizedId && existing.id !== provider?.id,
  );

  const canSave =
    normalizedId.length > 0 &&
    normalizedHost.length > 0 &&
    !idAlreadyExists &&
    (mode === "edit" || token.length > 0);

  const handleSave = async () => {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const nextProvider: GitProvider = {
        id: normalizedId,
        providerType: type,
        host: normalizedHost,
        username: username.trim() || null,
      };

      await onSave(nextProvider, token);

      showAppNotification({
        type: "success",
        title:
          mode === "add"
            ? `${name} provider added`
            : `${name} provider updated`,
        message: `${nextProvider.id} is ready to use.`,
      });

      setToken("");
    } catch (error) {
      showAppNotification({
        type: "error",
        title:
          mode === "add"
            ? `Failed to add ${name} provider`
            : `Failed to update ${name} provider`,
        message: String(error),
        messageFormat: "code",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove || isRemoving) {
      return;
    }

    setIsRemoving(true);

    try {
      await onRemove();

      showAppNotification({
        type: "success",
        title: `${name} provider removed`,
        message: `${provider?.id} was removed.`,
      });
    } catch (error) {
      showAppNotification({
        type: "error",
        title: `Failed to remove ${name} provider`,
        message: String(error),
        messageFormat: "code",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Stack gap="md" pt={mode === "edit" ? "xs" : 0}>
      {mode === "add" && <Text fw={600}>New {name} provider</Text>}

      <Group grow align="flex-start">
        <TextInput
          label="Provider ID"
          description="Unique name used by Neyra"
          placeholder={`${type}-work`}
          value={id}
          error={
            idAlreadyExists
              ? "A provider with this ID already exists"
              : undefined
          }
          onChange={(event) => setId(event.currentTarget.value)}
          {...TEXT_INPUT_ADDITIONAL_PROPS}
        />

        <TextInput
          label={`${name} instance`}
          description={`${name} cloud or a self-hosted instance`}
          placeholder={defaultHost}
          value={host}
          onChange={(event) => setHost(event.currentTarget.value)}
          {...TEXT_INPUT_ADDITIONAL_PROPS}
        />
      </Group>

      <TextInput
        label="Username"
        description="Optional"
        placeholder="username"
        value={username}
        onChange={(event) => setUsername(event.currentTarget.value)}
        {...TEXT_INPUT_ADDITIONAL_PROPS}
      />

      <PasswordInput
        label="Personal access token"
        description={
          mode === "edit"
            ? "Leave empty to keep the currently stored token"
            : "Stored securely in your system credential store"
        }
        placeholder={
          mode === "edit"
            ? "Leave empty to keep current token"
            : tokenPlaceholder
        }
        value={token}
        onChange={(event) => setToken(event.currentTarget.value)}
        autoComplete="new-password"
        spellCheck={false}
      />

      <Group justify="space-between" mt="xs">
        <div>
          {mode === "edit" && onRemove && (
            <Button
              radius="lg"
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={16} />}
              loading={isRemoving}
              disabled={isSaving}
              onClick={() => void handleRemove()}
            >
              Remove
            </Button>
          )}
        </div>

        <Group gap="xs">
          {mode === "add" && onCancel && (
            <Button
              radius="lg"
              className={classes.dangerButton}
              variant="subtle"
              disabled={isSaving}
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}

          <Button
            radius="lg"
            variant="light"
            leftSection={
              mode === "edit" ? (
                <IconDeviceFloppy size={17} />
              ) : (
                <IconPlus size={17} />
              )
            }
            loading={isSaving}
            disabled={!canSave || isRemoving}
            onClick={() => void handleSave()}
          >
            {mode === "edit" ? "Save changes" : "Add provider"}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

// EMPTY STATE

interface EmptyStateProps {
  name: string;
  icon: TablerIcon;
}

function EmptyState({ name, icon: ProviderIcon }: EmptyStateProps) {
  return (
    <Paper
      radius="xl"
      p="xl"
      bg="var(--neyra-surface-2)"
      style={{
        border: "1px dashed var(--neyra-border)",
      }}
    >
      <Stack align="center" gap="xs">
        <ProviderIcon size={30} stroke={1.4} color="var(--neyra-text-muted)" />

        <Text fw={600}>No {name} providers configured</Text>

        <Text size="sm" c="dimmed" ta="center">
          Add {name} cloud or a self-hosted instance.
        </Text>
      </Stack>
    </Paper>
  );
}
