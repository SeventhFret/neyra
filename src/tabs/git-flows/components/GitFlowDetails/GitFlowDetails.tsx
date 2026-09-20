import {
  ActionIcon,
  Button,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconPencil,
  IconPlayerPlayFilled,
  IconRoute,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

import { useGitFlowsStore } from "../../../../stores/gitFlows/store";
import type { GitFlow } from "../../../../stores/gitFlows/store.types";
import GitFlowStep from "../GitFlowStep/GitFlowStep";

import classes from "./GitFlowDetails.module.css";

type GitFlowsDetailsProps = {
  onEdit: (flow: GitFlow) => void;
};

export default function GitFlowsDetails({ onEdit }: GitFlowsDetailsProps) {
  const selected = useGitFlowsStore((state) => state.selected);
  const activeRun = useGitFlowsStore((state) => state.activeRun);
  const isRunning = useGitFlowsStore((state) => state.isRunning);

  const run = useGitFlowsStore((state) => state.run);
  const remove = useGitFlowsStore((state) => state.remove);

  const [deleteOpened, setDeleteOpened] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!selected) {
    return (
      <div className={classes.empty}>
        <IconRoute size={34} stroke={1.4} className={classes.emptyIcon} />

        <Text size="sm" fw={500}>
          Select a Git Flow
        </Text>

        <Text size="xs" c="dimmed" ta="center">
          Select a flow to view its steps and run it.
        </Text>
      </div>
    );
  }

  const selectedRun = activeRun?.flowId === selected.id ? activeRun : null;

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await remove(selected.id);
      setDeleteOpened(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={classes.root}>
        <div className={classes.header}>
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={5}>
              <Group gap={8}>
                <IconRoute
                  size={19}
                  stroke={1.7}
                  className={classes.headerIcon}
                />

                <Title order={3}>{selected.name}</Title>
              </Group>

              {selected.description && (
                <Text size="sm" c="dimmed" maw={700}>
                  {selected.description}
                </Text>
              )}
            </Stack>

            <Group gap="xs" wrap="nowrap">
              <Tooltip label="Edit flow">
                <ActionIcon
                  variant="subtle"
                  aria-label="Edit flow"
                  disabled={isRunning}
                  onClick={() => onEdit(selected)}
                >
                  <IconPencil size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Delete flow">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Delete flow"
                  disabled={isRunning}
                  onClick={() => setDeleteOpened(true)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>

              <Button
                leftSection={<IconPlayerPlayFilled size={14} />}
                loading={selectedRun?.isRunning ?? false}
                disabled={isRunning && !selectedRun?.isRunning}
                onClick={() => void run(selected)}
              >
                {selectedRun?.isRunning ? "Running" : "Run"}
              </Button>
            </Group>
          </Group>
        </div>

        <ScrollArea className={classes.scroll} type="auto">
          <div className={classes.steps}>
            {selected.steps.length === 0 ? (
              <Stack align="center" py="xl" gap={4}>
                <Text size="sm" fw={500}>
                  No steps
                </Text>

                <Text size="xs" c="dimmed">
                  Edit this flow to add a Git command.
                </Text>
              </Stack>
            ) : (
              selected.steps.map((step, index) => {
                const stepRun =
                  selectedRun?.steps.find((item) => item.stepId === step.id) ??
                  null;

                return (
                  <GitFlowStep
                    key={step.id}
                    step={step}
                    run={stepRun}
                    index={index}
                    isLast={index === selected.steps.length - 1}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <Modal
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        title="Delete Git Flow"
        centered
        size="sm"
      >
        <Stack gap="lg">
          <Text size="sm">
            Delete <strong>{selected.name}</strong>? This action cannot be
            undone.
          </Text>

          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={deleting}
              onClick={() => setDeleteOpened(false)}
            >
              Cancel
            </Button>

            <Button
              color="red"
              loading={deleting}
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
