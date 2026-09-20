import { Badge } from "@mantine/core";
import { IconCheck, IconClock, IconGitMerge, IconX } from "@tabler/icons-react";
import type { ProviderMergeRequest } from "../../../../stores/mergeRequests/store.types";

type MergeRequestsStatusProps = {
  request: ProviderMergeRequest;
};

export default function MergeRequestStatus({
  request,
}: MergeRequestsStatusProps) {
  switch (request.mergeStatus) {
    case "mergeable":
      return (
        <Badge
          color="teal"
          variant="light"
          leftSection={<IconCheck size={12} />}
        >
          Mergeable
        </Badge>
      );

    case "conflicts":
      return (
        <Badge color="red" variant="light" leftSection={<IconX size={12} />}>
          Conflicts
        </Badge>
      );

    case "blocked":
      return (
        <Badge
          color="orange"
          variant="light"
          leftSection={<IconGitMerge size={12} />}
        >
          Blocked
        </Badge>
      );

    case "checking":
      return (
        <Badge
          color="blue"
          variant="light"
          leftSection={<IconClock size={12} />}
        >
          Checking
        </Badge>
      );

    default:
      return null;
  }
}
