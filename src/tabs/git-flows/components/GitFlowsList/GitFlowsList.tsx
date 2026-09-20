import {
  Button,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconPlus, IconRoute, IconSearch } from "@tabler/icons-react";
import { useMemo, useRef, useState } from "react";

import { DockTooltip } from "../../../../components/NeyraDock/NeyraDock";
import { TEXT_INPUT_ADDITIONAL_PROPS } from "../../../../lib/constants/input";
import { useGitFlowsStore } from "../../../../stores/gitFlows/store";

import classes from "./GitFlowsList.module.css";

type GitFlowsListProps = {
  onCreate: () => void;
};

export default function GitFlowsList({ onCreate }: GitFlowsListProps) {
  const gitFlows = useGitFlowsStore((state) => state.flows);
  const selectedFlow = useGitFlowsStore((state) => state.selected);
  const selectFlow = useGitFlowsStore((state) => state.select);

  const [search, setSearch] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const filteredFlows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return gitFlows;
    }

    return gitFlows.filter((flow) => {
      return (
        flow.name.toLowerCase().includes(query) ||
        flow.id.toLowerCase().includes(query) ||
        flow.description?.toLowerCase().includes(query)
      );
    });
  }, [gitFlows, search]);

  return (
    <Stack gap="sm" h="100%" style={{ minHeight: 0 }}>
      {gitFlows.length > 0 && (
        <Tooltip
          label={
            <DockTooltip
              label="Search"
              shortcut={{
                modifiers: ["mod"],
                key: "F",
              }}
            />
          }
        >
          <TextInput
            ref={searchInputRef}
            placeholder="Search flows..."
            leftSection={<IconSearch size={15} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            {...TEXT_INPUT_ADDITIONAL_PROPS}
          />
        </Tooltip>
      )}

      <ScrollArea className={classes.scroll} type="auto">
        {gitFlows.length === 0 ? (
          <Stack align="center" justify="center" py="xl" gap={4}>
            <IconRoute size={24} stroke={1.5} />

            <Text size="sm" fw={500}>
              No Git Flows yet
            </Text>

            <Text size="xs" c="dimmed">
              Create your first flow.
            </Text>
          </Stack>
        ) : filteredFlows.length === 0 ? (
          <Stack align="center" justify="center" py="xl" gap={4}>
            <Text size="sm" fw={500}>
              No Git Flows found
            </Text>

            <Text size="xs" c="dimmed">
              Try changing your search.
            </Text>
          </Stack>
        ) : (
          <Stack gap={4}>
            {filteredFlows.map((flow) => {
              const active = selectedFlow?.id === flow.id;

              return (
                <UnstyledButton
                  key={flow.id}
                  className={classes.item}
                  data-active={active || undefined}
                  onClick={() => selectFlow(flow)}
                >
                  <Group wrap="nowrap" align="flex-start">
                    <IconRoute
                      className={classes.flowIcon}
                      size={17}
                      stroke={1.7}
                    />

                    <Stack gap={3} className={classes.content}>
                      <Text size="sm" fw={600} truncate>
                        {flow.name}
                      </Text>

                      <Text size="xs" c="dimmed">
                        {flow.steps.length}{" "}
                        {flow.steps.length === 1 ? "step" : "steps"}
                      </Text>
                    </Stack>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        )}
      </ScrollArea>

      <Button
        variant="outline"
        fullWidth
        leftSection={<IconPlus size={16} />}
        onClick={onCreate}
      >
        New flow
      </Button>
    </Stack>
  );
}
