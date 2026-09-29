import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Divider,
  Drawer,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconBraces,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import { TEXT_INPUT_ADDITIONAL_PROPS } from "../../../../lib/constants/input";
import { useGitFlowsStore } from "../../../../stores/gitFlows/store";
import type {
  GitFlow,
  GitFlowStep,
} from "../../../../stores/gitFlows/store.types";

import classes from "./GitFlowEditor.module.css";

type GitFlowEditorProps = {
  opened: boolean;
  onClose: () => void;
  flow?: GitFlow | null;
};

const GIT_FLOW_VARIABLES = [
  {
    name: "currentBranch",
    value: "{{currentBranch}}",
  },
  {
    name: "repositoryRoot",
    value: "{{repositoryRoot}}",
  },
  {
    name: "remote",
    value: "{{remote}}",
  },
  {
    name: "defaultBranch",
    value: "{{defaultBranch}}",
  },
] as const;

export default function GitFlowEditor({
  opened,
  onClose,
  flow = null,
}: GitFlowEditorProps) {
  const add = useGitFlowsStore((state) => state.add);
  const update = useGitFlowsStore((state) => state.update);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<GitFlowStep[]>([]);
  const [saving, setSaving] = useState(false);

  const editing = flow !== null;

  useEffect(() => {
    if (!opened) {
      return;
    }

    if (flow) {
      setName(flow.name);
      setDescription(flow.description ?? "");
      setSteps(
        flow.steps.map((step) => ({
          ...step,
          args: [...step.args],
        })),
      );

      return;
    }

    setName("");
    setDescription("");
    setSteps([]);
  }, [opened, flow]);

  const addStep = () => {
    setSteps((current) => [...current, createEmptyStep()]);
  };

  const updateStep = (id: string, update: Partial<GitFlowStep>) => {
    setSteps((current) =>
      current.map((step) =>
        step.id === id
          ? {
              ...step,
              ...update,
            }
          : step,
      ),
    );
  };

  const removeStep = (id: string) => {
    setSteps((current) => current.filter((step) => step.id !== id));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((current) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

      return next;
    });
  };

  const handleSave = async () => {
    if (!isValid(name, steps)) {
      return;
    }

    const gitFlow: GitFlow = {
      id: flow?.id ?? crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || null,

      steps: steps.map((step) => ({
        ...step,
        name: step.name.trim(),
        args: step.args.map((argument) => argument.trim()),
      })),
    };

    setSaving(true);

    try {
      if (editing) {
        await update(gitFlow);
      } else {
        await add(gitFlow);
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  const valid = isValid(name, steps);

  return (
    <Drawer
      opened={opened}
      onClose={saving ? () => undefined : onClose}
      position="right"
      size={600}
      title={editing ? "Edit Git Flow" : "New Git Flow"}
      padding={0}
      offset={10}
      classNames={{
        body: classes.drawerBody,
        content: classes.drawerContent,
      }}
    >
      <div className={classes.editor}>
        <div className={classes.editorHeader}>
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Update & rebase"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              disabled={saving}
              {...TEXT_INPUT_ADDITIONAL_PROPS}
            />

            <Textarea
              label="Description"
              placeholder="Update main and rebase the current branch"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              autosize
              minRows={2}
              maxRows={4}
              disabled={saving}
              {...TEXT_INPUT_ADDITIONAL_PROPS}
            />

            <Divider className={classes.divider} />

            <Group justify="space-between">
              <Stack gap={1}>
                <Text size="sm" fw={600}>
                  Steps
                </Text>

                <Text size="xs" c="dimmed">
                  Commands run from top to bottom.
                </Text>
              </Stack>

              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={addStep}
                disabled={saving}
              >
                Add step
              </Button>
            </Group>
          </Stack>
        </div>

        <ScrollArea
          className={classes.stepsScroll}
          type="auto"
          offsetScrollbars
        >
          <div className={classes.stepsContent}>
            {steps.length === 0 ? (
              <button
                type="button"
                className={classes.emptySteps}
                onClick={addStep}
                disabled={saving}
              >
                <IconPlus size={20} />

                <Text size="sm" fw={500}>
                  Add your first step
                </Text>

                <Text size="xs" c="dimmed">
                  Each step runs one Git command.
                </Text>
              </button>
            ) : (
              <Stack gap="sm">
                {steps.map((step, index) => (
                  <StepEditor
                    key={step.id}
                    step={step}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === steps.length - 1}
                    disabled={saving}
                    onChange={(update) => updateStep(step.id, update)}
                    onRemove={() => removeStep(step.id)}
                    onMoveUp={() => moveStep(index, -1)}
                    onMoveDown={() => moveStep(index, 1)}
                  />
                ))}
              </Stack>
            )}
          </div>
        </ScrollArea>

        <div className={classes.footer}>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={saving}>
              Cancel
            </Button>

            <Button
              onClick={() => void handleSave()}
              loading={saving}
              disabled={!valid}
            >
              {editing ? "Save changes" : "Create flow"}
            </Button>
          </Group>
        </div>
      </div>
    </Drawer>
  );
}

type StepEditorProps = {
  step: GitFlowStep;
  index: number;

  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;

  onChange: (update: Partial<GitFlowStep>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function StepEditor({
  step,
  index,
  isFirst,
  isLast,
  disabled,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: StepEditorProps) {
  const updateArgument = (index: number, value: string) => {
    const args = [...step.args];

    args[index] = value;

    onChange({ args });
  };

  const addArgument = () => {
    onChange({
      args: [...step.args, ""],
    });
  };

  const removeArgument = (index: number) => {
    onChange({
      args: step.args.filter((_, argumentIndex) => argumentIndex !== index),
    });
  };

  const insertVariable = (variable: string) => {
    onChange({
      args: [...step.args, variable],
    });
  };

  return (
    <Paper className={classes.step} radius="md">
      <Stack gap="sm" className={classes.stepContent}>
        <Group justify="space-between" wrap="nowrap">
          <Text size="xs" c="dimmed">
            Step {index + 1}
          </Text>

          <Group gap={2} wrap="nowrap">
            <Tooltip label="Move up">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                disabled={disabled || isFirst}
                onClick={onMoveUp}
              >
                <IconArrowUp size={14} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Move down">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                disabled={disabled || isLast}
                onClick={onMoveDown}
              >
                <IconArrowDown size={14} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Remove step">
              <ActionIcon
                variant="subtle"
                radius="sm"
                color="var(--neyra-danger)"
                size="sm"
                disabled={disabled}
                onClick={onRemove}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <TextInput
          label="Name"
          placeholder="Switch to main"
          value={step.name}
          onChange={(event) =>
            onChange({
              name: event.currentTarget.value,
            })
          }
          disabled={disabled}
          {...TEXT_INPUT_ADDITIONAL_PROPS}
        />

        <Stack gap={7}>
          <Stack gap={2}>
            <Text size="sm" fw={500}>
              Arguments
            </Text>

            <Text size="xs" c="dimmed">
              Arguments are passed directly to Git.
            </Text>
          </Stack>

          <Group gap={6} wrap="wrap">
            <Text component="code" size="xs" className={classes.git}>
              git
            </Text>

            {GIT_FLOW_VARIABLES.map((variable) => (
              <Tooltip key={variable.name} label={`Insert ${variable.value}`}>
                <Badge
                  component="button"
                  type="button"
                  variant="light"
                  size="sm"
                  leftSection={<IconBraces size={11} />}
                  className={classes.variableButton}
                  disabled={disabled}
                  onClick={() => insertVariable(variable.value)}
                >
                  {variable.value}
                </Badge>
              </Tooltip>
            ))}
          </Group>

          {step.args.map((argument, argumentIndex) => (
            <ArgumentInput
              key={argumentIndex}
              value={argument}
              index={argumentIndex}
              disabled={disabled}
              onChange={(value) => updateArgument(argumentIndex, value)}
              onRemove={() => removeArgument(argumentIndex)}
            />
          ))}

          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<IconPlus size={13} />}
            onClick={addArgument}
            disabled={disabled}
            className={classes.addArgument}
          >
            Add argument
          </Button>
        </Stack>

        <Checkbox
          label="Stop flow if this step fails"
          checked={step.stopOnFailure}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              stopOnFailure: event.currentTarget.checked,
            })
          }
        />
      </Stack>
    </Paper>
  );
}

type ArgumentInputProps = {
  value: string;
  index: number;
  disabled: boolean;

  onChange: (value: string) => void;
  onRemove: () => void;
};

function ArgumentInput({
  value,
  index,
  disabled,
  onChange,
  onRemove,
}: ArgumentInputProps) {
  const variables = useMemo(() => findVariables(value), [value]);

  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <TextInput
          flex={1}
          placeholder={getArgumentPlaceholder(index)}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          disabled={disabled}
          {...TEXT_INPUT_ADDITIONAL_PROPS}
        />

        <Tooltip label="Remove argument">
          <ActionIcon
            variant="subtle"
            color="var(--neyra-danger)"
            disabled={disabled}
            onClick={onRemove}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {variables.length > 0 && (
        <Group gap={5}>
          {variables.map((variable, variableIndex) => (
            <Text
              key={`${variable}-${variableIndex}`}
              component="code"
              size="xs"
              className={classes.variable}
            >
              {variable}
            </Text>
          ))}
        </Group>
      )}
    </Stack>
  );
}

function createEmptyStep(): GitFlowStep {
  return {
    id: crypto.randomUUID(),
    name: "",
    args: [""],
    stopOnFailure: true,
  };
}

function isValid(name: string, steps: GitFlowStep[]) {
  return (
    name.trim().length > 0 &&
    steps.length > 0 &&
    steps.every(
      (step) =>
        step.name.trim().length > 0 &&
        step.args.length > 0 &&
        step.args.every((argument) => argument.trim().length > 0),
    )
  );
}

function getArgumentPlaceholder(index: number) {
  switch (index) {
    case 0:
      return "command, e.g. switch";

    case 1:
      return "argument, e.g. main";

    default:
      return `argument ${index + 1}`;
  }
}

function findVariables(value: string) {
  return value.match(/\{\{[a-zA-Z][a-zA-Z0-9]*\}\}/g) ?? [];
}
