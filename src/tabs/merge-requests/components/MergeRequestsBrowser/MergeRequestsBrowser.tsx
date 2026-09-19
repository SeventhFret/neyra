import {
  ActionIcon,
  Group,
  SegmentedControl,
  Stack,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconList,
  IconRefresh,
  IconSearch,
  IconSitemap,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import type { ProviderMergeRequest } from "../../../../stores/mergeRequests/store.types";
import MergeRequestsList from "../MergeRequestsList/MergeRequestsList";
import MergeRequestsTree from "../MergeRequestsTree/MergeRequestsTree";
import { TEXT_INPUT_ADDITIONAL_PROPS } from "../../../../lib/constants/input";

type MergeRequestsBrowserProps = {
  requests: ProviderMergeRequest[];
  selected: ProviderMergeRequest | null;
  loading?: boolean;

  onSelect: (request: ProviderMergeRequest) => void;
  onRefresh: () => void;
};

type ViewMode = "tree" | "list";

export default function MergeRequestsBrowser({
  requests,
  selected,
  loading = false,
  onSelect,
  onRefresh,
}: MergeRequestsBrowserProps) {
  const [view, setView] = useState<ViewMode>("tree");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return requests;
    }

    return requests.filter((request) => {
      return (
        request.title.toLowerCase().includes(query) ||
        request.repository.toLowerCase().includes(query) ||
        request.author.username.toLowerCase().includes(query) ||
        request.author.displayName?.toLowerCase().includes(query) ||
        request.sourceBranch.toLowerCase().includes(query) ||
        request.targetBranch.toLowerCase().includes(query)
      );
    });
  }, [requests, search]);

  return (
    <Stack gap="sm" h="100%" style={{ minHeight: 0 }}>
      <Group gap="xs" wrap="nowrap">
        <TextInput
          flex={1}
          placeholder="Search requests..."
          leftSection={<IconSearch size={15} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          {...TEXT_INPUT_ADDITIONAL_PROPS}
        />

        <Tooltip label="Refresh">
          <ActionIcon
            variant="default"
            size="lg"
            loading={loading}
            onClick={onRefresh}
            aria-label="Refresh merge requests"
          >
            <IconRefresh size={17} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <SegmentedControl
        fullWidth
        size="xs"
        value={view}
        onChange={(value) => setView(value as ViewMode)}
        data={[
          {
            value: "tree",
            label: (
              <Group gap={6} justify="center">
                <IconSitemap size={14} />
                Tree
              </Group>
            ),
          },
          {
            value: "list",
            label: (
              <Group gap={6} justify="center">
                <IconList size={14} />
                List
              </Group>
            ),
          },
        ]}
      />

      {view === "tree" ? (
        <MergeRequestsTree
          requests={filtered}
          selected={selected}
          onSelect={onSelect}
        />
      ) : (
        <MergeRequestsList
          requests={filtered}
          selected={selected}
          onSelect={onSelect}
        />
      )}
    </Stack>
  );
}
