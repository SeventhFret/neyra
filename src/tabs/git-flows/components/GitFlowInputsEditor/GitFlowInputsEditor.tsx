import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconPlus,
  IconRotateClockwise2,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import classes from "./GitFlowInputsEditor.module.css";
import { TEXT_INPUT_ADDITIONAL_PROPS } from "../../../../lib/constants/input";
import { useRepoDataStore } from "../../../../stores/repoData/store";
import { useGitFlowInputsStore } from "../../../../stores/gitFlowsInputs/store";
import { useGitFlowsStore } from "../../../../stores/gitFlows/store";

interface GitFlowInputsEditorProps {
  opened: boolean;
  onClose: () => void;
}

interface VariableDefinition {
  id: string;
  name: string;
  value: string;
}

interface VariableErrors {
  name?: string;
  value?: string;
}

const VARIABLE_NAME_REGEX = /^[a-z][a-zA-Z0-9]*$/;

const findDuplicates = (values: string[]) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }

  return duplicates;
};

export default function GitFlowInputsEditor({
  opened,
  onClose,
}: GitFlowInputsEditorProps) {
  const remotes = useRepoDataStore((state) => state.remotes);
  const upstream = useRepoDataStore((state) => state.upstream);
  const branches = useRepoDataStore((state) => state.branches);
  const repoRoot = useRepoDataStore((state) => state.root);

  const setInputs = useGitFlowInputsStore((state) => state.setInputs);
  const getInputs = useGitFlowInputsStore((state) => state.getInputs);

  const selectedGitFlow = useGitFlowsStore((state) => state.selected);

  const gitFlowInputs = useMemo(() => {
    if (!repoRoot || !selectedGitFlow) {
      return undefined;
    }

    return getInputs(repoRoot, selectedGitFlow.id);
  }, [repoRoot, selectedGitFlow, getInputs]);

  const [selectedRemote, setSelectedRemote] = useState<string | null>(null);
  const [selectedDefaultBranch, setSelectedDefaultBranch] = useState<
    string | null
  >(null);
  const [variables, setVariables] = useState<VariableDefinition[]>([]);

  const automaticRemote = useMemo(() => {
    if (upstream) {
      const upstreamRemote = remotes.find(
        (remote) => remote.name === upstream.remote,
      );

      if (upstreamRemote) {
        return upstreamRemote.name;
      }
    }

    const origin = remotes.find((remote) => remote.name === "origin");

    if (origin) {
      return origin.name;
    }

    if (remotes.length === 1) {
      return remotes[0].name;
    }

    return undefined;
  }, [remotes, upstream]);

  const resolvedRemote = selectedRemote ?? automaticRemote;

  const automaticDefaultBranch = useMemo(() => {
    if (!resolvedRemote) {
      return undefined;
    }

    return remotes.find((remote) => remote.name === resolvedRemote)
      ?.defaultBranch;
  }, [remotes, resolvedRemote]);

  const variableErrors = useMemo(() => {
    const errors: Record<string, VariableErrors> = {};

    const duplicatedNames = findDuplicates(
      variables.map((variable) => variable.name.trim()).filter(Boolean),
    );

    for (const variable of variables) {
      const name = variable.name.trim();
      const fieldErrors: VariableErrors = {};

      if (!name) {
        fieldErrors.name = "Variable name is required";
      } else {
        const isDuplicate = duplicatedNames.has(name);
        const isInvalidFormat = !VARIABLE_NAME_REGEX.test(name);

        if (isDuplicate && isInvalidFormat) {
          fieldErrors.name = "Name must be unique and use camelCase";
        } else if (isDuplicate) {
          fieldErrors.name = "Variable name must be unique";
        } else if (isInvalidFormat) {
          fieldErrors.name = "Name must use camelCase";
        }
      }

      if (!variable.value.trim()) {
        fieldErrors.value = "Variable value is required";
      }

      if (fieldErrors.name || fieldErrors.value) {
        errors[variable.id] = fieldErrors;
      }
    }

    return errors;
  }, [variables]);

  const hasErrors = Object.keys(variableErrors).length > 0;

  useEffect(() => {
    if (!opened) {
      return;
    }

    setSelectedRemote(gitFlowInputs?.remote ?? null);
    setSelectedDefaultBranch(gitFlowInputs?.defaultBranch ?? null);

    setVariables(
      Object.entries(gitFlowInputs?.variables ?? {}).map(([name, value]) => ({
        id: crypto.randomUUID(),
        name,
        value,
      })),
    );
  }, [opened, gitFlowInputs]);

  const handleSave = () => {
    if (!repoRoot || !selectedGitFlow || hasErrors) {
      return;
    }

    const variableValues = Object.fromEntries(
      variables.map((variable) => [variable.name.trim(), variable.value]),
    );

    setInputs(repoRoot, selectedGitFlow.id, {
      remote: selectedRemote ?? undefined,
      defaultBranch: selectedDefaultBranch ?? undefined,
      variables: variableValues,
    });

    onClose();
  };

  const handleReset = () => {
    setSelectedRemote(null);
    setSelectedDefaultBranch(null);
    setVariables([]);
  };

  const handleAddVariable = () => {
    setVariables((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        value: "",
      },
    ]);
  };

  const handleRemoveVariable = (id: string) => {
    setVariables((current) => current.filter((variable) => variable.id !== id));
  };

  const handleVariableNameChange = (id: string, name: string) => {
    setVariables((current) =>
      current.map((variable) =>
        variable.id === id
          ? {
              ...variable,
              name,
            }
          : variable,
      ),
    );
  };

  const handleVariableValueChange = (id: string, value: string) => {
    setVariables((current) =>
      current.map((variable) =>
        variable.id === id
          ? {
              ...variable,
              value,
            }
          : variable,
      ),
    );
  };

  if (!selectedGitFlow) {
    return null;
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      radius="xl"
      size="lg"
      title="Edit inputs for the selected Git Flow"
      classNames={{
        content: classes.modal,
        header: classes.header,
        title: classes.modalTitle,
        body: classes.body,
        close: classes.close,
        overlay: classes.overlay,
      }}
    >
      <Stack className={classes.content} gap="xl">
        <Stack gap="md">
          <SectionHeader
            title="Git context"
            description="Resolved automatically from the repository unless you provide an override."
          />

          <Group grow align="flex-start" gap="md">
            <Select
              label="Remote"
              placeholder="Automatic"
              description={
                automaticRemote
                  ? `Currently resolves to ${automaticRemote}`
                  : "No remote could be resolved automatically"
              }
              value={selectedRemote}
              onChange={setSelectedRemote}
              data={remotes.map((remote) => remote.name)}
              clearable
            />

            <Select
              label="Default branch"
              placeholder="Automatic"
              description={
                automaticDefaultBranch
                  ? `Currently resolves to ${automaticDefaultBranch}`
                  : "No default branch could be resolved automatically"
              }
              value={selectedDefaultBranch}
              onChange={setSelectedDefaultBranch}
              data={branches
                .filter((branch) => !branch.isRemote && branch.name)
                .map((branch) => branch.name)}
              clearable
            />
          </Group>
        </Stack>

        <div className={classes.divider} />

        <Stack gap="md">
          <SectionHeader
            title="Variables"
            description={
              <>
                Custom values available as{" "}
                <Box component="code" className={classes.inlineCode}>
                  {"{{variable}}"}
                </Box>{" "}
                in flow commands.
              </>
            }
            action={
              <Button
                variant="subtle"
                size="sm"
                leftSection={<IconPlus size={18} />}
                onClick={handleAddVariable}
              >
                Add variable
              </Button>
            }
          />

          {variables.length > 0 ? (
            <Stack gap="sm">
              {variables.map((variable) => (
                <VariableRow
                  key={variable.id}
                  name={variable.name}
                  value={variable.value}
                  nameError={variableErrors[variable.id]?.name}
                  valueError={variableErrors[variable.id]?.value}
                  onRemove={() => handleRemoveVariable(variable.id)}
                  onNameChange={(name) =>
                    handleVariableNameChange(variable.id, name)
                  }
                  onValueChange={(value) =>
                    handleVariableValueChange(variable.id, value)
                  }
                />
              ))}
            </Stack>
          ) : (
            <Text size="sm" className={classes.emptyVariables}>
              No custom variables configured.
            </Text>
          )}
        </Stack>

        <Group className={classes.actions} justify="flex-end" gap="sm">
          <Button
            variant="subtle"
            radius="lg"
            leftSection={<IconRotateClockwise2 stroke={1.7} size={19} />}
            onClick={handleReset}
          >
            Reset
          </Button>

          <Button
            radius="lg"
            variant="filled"
            disabled={hasErrors}
            onClick={handleSave}
            leftSection={<IconDeviceFloppy stroke={1.7} size={19} />}
          >
            Save inputs
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

interface SectionHeaderProps {
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}

function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
      <Stack gap={3}>
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          className={classes.sectionTitle}
        >
          {title}
        </Text>

        <Text size="xs" className={classes.description}>
          {description}
        </Text>
      </Stack>

      {action}
    </Group>
  );
}

interface VariableRowProps {
  name: string;
  value: string;
  nameError?: string;
  valueError?: string;
  onRemove: () => void;
  onNameChange: (name: string) => void;
  onValueChange: (value: string) => void;
}

function VariableRow({
  name,
  value,
  nameError,
  valueError,
  onRemove,
  onNameChange,
  onValueChange,
}: VariableRowProps) {
  return (
    <Stack gap={4}>
      <Group gap="xs" wrap="nowrap" align="center">
        <TextInput
          {...TEXT_INPUT_ADDITIONAL_PROPS}
          value={name}
          error={Boolean(nameError)}
          placeholder="Variable name"
          className={classes.variableName}
          onChange={(event) => onNameChange(event.currentTarget.value)}
        />

        <TextInput
          {...TEXT_INPUT_ADDITIONAL_PROPS}
          value={value}
          error={Boolean(valueError)}
          placeholder="Value"
          className={classes.variableValue}
          onChange={(event) => onValueChange(event.currentTarget.value)}
        />

        <ActionIcon
          variant="subtle"
          size="lg"
          aria-label={name ? `Remove ${name}` : "Remove variable"}
          onClick={onRemove}
          className={classes.removeButton}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>

      {(nameError || valueError) && (
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <Box className={classes.variableName}>
            {nameError && (
              <Text size="xs" className={classes.variableError}>
                {nameError}
              </Text>
            )}
          </Box>

          <Box className={classes.variableValue}>
            {valueError && (
              <Text size="xs" className={classes.variableError}>
                {valueError}
              </Text>
            )}
          </Box>

          <div className={classes.removeButtonSpacer} />
        </Group>
      )}
    </Stack>
  );
}
