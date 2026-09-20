import {
  Badge,
  Box,
  Collapse,
  Group,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";

import type {
  GitFlowStep as GitFlowStepType,
  GitFlowStepRun,
  GitFlowStepStatus,
} from "../../../../stores/gitFlows/store.types";

import classes from "./GitFlowStep.module.css";

type GitFlowStepProps = {
  step: GitFlowStepType;
  run: GitFlowStepRun | null;

  index: number;
  isLast: boolean;
};

export default function GitFlowStep({
  step,
  run,
  index,
  isLast,
}: GitFlowStepProps) {
  const [outputOpened, setOutputOpened] = useState(false);

  const status: GitFlowStepStatus = run?.status ?? "pending";
  const hasOutput = Boolean(run?.stdout || run?.stderr);
  const duration = getDuration(run);

  return (
    <div className={classes.step}>
      <div className={classes.timeline}>
        <div className={classes.status} data-status={status}>
          <StatusIcon status={status} />
        </div>

        {!isLast && (
          <div
            className={classes.line}
            data-complete={
              status === "success" ||
              status === "failed" ||
              status === "timedOut"
                ? true
                : undefined
            }
          />
        )}
      </div>

      <div className={classes.content}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap={8} wrap="nowrap">
            <Text size="xs" c="dimmed" className={classes.number}>
              {index + 1}
            </Text>

            <Text size="sm" fw={600}>
              {step.name}
            </Text>

            {!step.stopOnFailure && (
              <Badge size="xs" variant="light" color="gray">
                Continue on failure
              </Badge>
            )}
          </Group>

          <Group gap={8} wrap="nowrap">
            {duration !== null && (
              <Text size="xs" c="dimmed" ff="monospace">
                {formatDuration(duration)}
              </Text>
            )}

            <StatusLabel status={status} />
          </Group>
        </Group>

        <Box className={classes.command} component="code">
          <span className={classes.git}>git</span> {step.args.join(" ")}
        </Box>

        {run && hasOutput && (
          <>
            <UnstyledButton
              className={classes.outputToggle}
              onClick={() => setOutputOpened((opened) => !opened)}
            >
              <Group gap={5}>
                {outputOpened ? (
                  <IconChevronDown size={13} />
                ) : (
                  <IconChevronRight size={13} />
                )}

                <Text size="xs">Console output</Text>
              </Group>
            </UnstyledButton>

            <Collapse expanded={outputOpened}>
              <div className={classes.console}>
                {run.stdout && <pre>{run.stdout}</pre>}

                {run.stderr && (
                  <pre
                    className={
                      status === "failed" || status === "timedOut"
                        ? classes.stderr
                        : undefined
                    }
                  >
                    {run.stderr}
                  </pre>
                )}
              </div>
            </Collapse>
          </>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: GitFlowStepStatus }) {
  switch (status) {
    case "running":
      return <IconPlayerPlay size={13} stroke={2} />;

    case "success":
      return <IconCheck size={13} stroke={2.5} />;

    case "failed":
      return <IconX size={13} stroke={2.5} />;

    case "timedOut":
      return <IconClock size={13} stroke={2} />;

    case "skipped":
      return <IconChevronRight size={12} />;

    case "pending":
      return null;
  }
}

function StatusLabel({ status }: { status: GitFlowStepStatus }) {
  switch (status) {
    case "running":
      return (
        <Badge size="xs" variant="light">
          Running
        </Badge>
      );

    case "success":
      return (
        <Badge size="xs" variant="light" color="teal">
          Success
        </Badge>
      );

    case "failed":
      return (
        <Badge size="xs" variant="light" color="red">
          Failed
        </Badge>
      );

    case "timedOut":
      return (
        <Badge
          size="xs"
          variant="light"
          color="orange"
          leftSection={<IconAlertTriangle size={10} />}
        >
          Timed out
        </Badge>
      );

    case "skipped":
      return (
        <Text size="xs" c="dimmed">
          Skipped
        </Text>
      );

    case "pending":
      return null;
  }
}

function getDuration(run: GitFlowStepRun | null) {
  if (!run || run.startedAt === null || run.finishedAt === null) {
    return null;
  }

  return run.finishedAt - run.startedAt;
}

function formatDuration(duration: number) {
  if (duration < 1000) {
    return `${duration} ms`;
  }

  return `${(duration / 1000).toFixed(1)} s`;
}
