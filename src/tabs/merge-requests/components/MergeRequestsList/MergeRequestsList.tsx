import {
  Badge,
  Group,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconBrandGitlab,
  IconGitPullRequest,
} from "@tabler/icons-react";

import classes from "./MergeRequestsList.module.css";

import type { ProviderMergeRequest } from "../../../../stores/mergeRequests/store.types";

type MergeRequestsListProps = {
  requests: ProviderMergeRequest[];
  selected: ProviderMergeRequest | null;
  onSelect: (request: ProviderMergeRequest) => void;
};

export default function MergeRequestList({
  requests,
  selected,
  onSelect,
}: MergeRequestsListProps) {
  if (requests.length === 0) {
    return (
      <Stack align="center" justify="center" flex={1} gap={4}>
        <Text size="sm" fw={500}>
          No requests found
        </Text>

        <Text size="xs" c="dimmed">
          Try changing your search.
        </Text>
      </Stack>
    );
  }
  return (
    <ScrollArea className={classes.scroll}>
      <Stack gap={4}>
        {requests.map((request) => {
          const active =
            selected?.providerId === request.providerId &&
            selected?.id === request.id;

          const ProviderIcon =
            request.providerType === "gitlab"
              ? IconBrandGitlab
              : IconBrandGithub;

          return (
            <UnstyledButton
              key={`${request.providerId}-${request.id}`}
              className={classes.item}
              data-active={active || undefined}
              onClick={() => onSelect(request)}
            >
              <Group wrap="nowrap" align="flex-start">
                <ProviderIcon
                  className={classes.providerIcon}
                  size={17}
                  stroke={1.7}
                />

                <Stack gap={5} className={classes.content}>
                  <Text size="sm" fw={600} lineClamp={2}>
                    {request.title}
                  </Text>

                  <Group gap={6} wrap="nowrap">
                    <Text size="xs" c="dimmed" truncate>
                      {request.repository}
                    </Text>

                    <Text size="xs" c="dimmed">
                      ·
                    </Text>

                    <Group gap={3} wrap="nowrap">
                      <IconGitPullRequest size={12} />
                      <Text size="xs" c="dimmed">
                        {request.number}
                      </Text>
                    </Group>

                    {request.draft && (
                      <Badge size="xs" variant="light" color="gray">
                        Draft
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Group>
            </UnstyledButton>
          );
        })}
      </Stack>
    </ScrollArea>
  );
}
