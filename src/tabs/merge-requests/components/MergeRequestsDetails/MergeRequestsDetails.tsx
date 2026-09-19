import {
  ActionIcon,
  Avatar,
  AvatarGroup,
  Badge,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowRight,
  IconBrandGithub,
  IconBrandGitlab,
  IconExternalLink,
  IconGitBranch,
  IconGitPullRequest,
} from "@tabler/icons-react";
import { openUrl } from "@tauri-apps/plugin-opener";

import MergeRequestStatus from "../MergeRequestsStatus/MergeRequestStatus";
import classes from "./MergeRequestsDetails.module.css";

import type { ProviderMergeRequest } from "../../../../stores/mergeRequests/store.types";

type MergeRequestsDetailsProps = {
  request: ProviderMergeRequest | null;
};

export default function MergeRequestDetails({
  request,
}: MergeRequestsDetailsProps) {
  if (!request) {
    return (
      <Stack className={classes.empty} align="center" justify="center" gap="xs">
        <IconGitPullRequest size={32} stroke={1.3} />

        <Text fw={600}>Select a request</Text>

        <Text size="sm" c="dimmed">
          Choose a merge or pull request to view its details.
        </Text>
      </Stack>
    );
  }

  const ProviderIcon =
    request.providerType === "gitlab" ? IconBrandGitlab : IconBrandGithub;

  return (
    <ScrollArea className={classes.details}>
      <Stack gap="lg" p="lg">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <Group gap={7}>
              <ProviderIcon size={16} />

              <Text size="sm" c="dimmed">
                {request.repository}
              </Text>

              <Text size="sm" c="dimmed">
                #{request.number}
              </Text>
            </Group>

            <Tooltip
              label={`Open in ${
                request.providerType === "gitlab" ? "GitLab" : "GitHub"
              }`}
            >
              <ActionIcon variant="subtle" onClick={() => openUrl(request.url)}>
                <IconExternalLink size={17} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Text className={classes.title}>{request.title}</Text>

          <Group gap="xs">
            <MergeRequestStatus request={request} />

            {request.draft && (
              <Badge variant="light" color="gray">
                Draft
              </Badge>
            )}
          </Group>
        </Stack>

        <Divider className={classes.divider} />

        <Group gap="xl" align="flex-start">
          <Stack gap={6}>
            <Text className={classes.sectionLabel}>Author</Text>

            <Group gap="xs">
              <Avatar
                size={28}
                src={request.author.avatarUrl}
                name={request.author.displayName ?? request.author.username}
              />

              <Stack gap={0}>
                <Text size="sm" fw={500}>
                  {request.author.displayName ?? request.author.username}
                </Text>

                {request.author.displayName && (
                  <Text size="xs" c="dimmed">
                    @{request.author.username}
                  </Text>
                )}
              </Stack>
            </Group>
          </Stack>

          <Stack gap={6}>
            <Text className={classes.sectionLabel}>Reviewers</Text>

            {request.reviewers.length > 0 ? (
              <AvatarGroup>
                {request.reviewers.map((reviewer) => (
                  <Tooltip
                    key={reviewer.username}
                    label={reviewer.displayName ?? reviewer.username}
                  >
                    <Avatar
                      size={28}
                      src={reviewer.avatarUrl}
                      name={reviewer.displayName ?? reviewer.username}
                    />
                  </Tooltip>
                ))}
              </AvatarGroup>
            ) : (
              <Text size="sm" c="dimmed">
                None
              </Text>
            )}
          </Stack>
        </Group>

        <Stack gap={7}>
          <Text className={classes.sectionLabel}>Branches</Text>

          <Group gap="xs">
            <Badge
              className={classes.branch}
              variant="default"
              leftSection={<IconGitBranch size={13} />}
            >
              {request.sourceBranch}
            </Badge>

            <IconArrowRight size={15} color="var(--neyra-text-muted)" />

            <Badge
              className={classes.branch}
              variant="default"
              leftSection={<IconGitBranch size={13} />}
            >
              {request.targetBranch}
            </Badge>
          </Group>
        </Stack>

        <Divider className={classes.divider} />

        <Stack gap="xs">
          <Text className={classes.sectionLabel}>Description</Text>

          {request.description ? (
            <Text
              size="sm"
              c="var(--neyra-text-secondary)"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {request.description}
            </Text>
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              No description provided.
            </Text>
          )}
        </Stack>
      </Stack>
    </ScrollArea>
  );
}
