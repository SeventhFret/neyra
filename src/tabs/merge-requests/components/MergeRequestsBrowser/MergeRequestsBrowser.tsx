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
import { useMemo, useRef, useState } from "react";
import { DockTooltip } from "../../../../components/NeyraDock/NeyraDock";

import type { ProviderMergeRequest } from "../../../../stores/mergeRequests/store.types";
import MergeRequestsList from "../MergeRequestsList/MergeRequestsList";
import MergeRequestsTree from "../MergeRequestsTree/MergeRequestsTree";
import { TEXT_INPUT_ADDITIONAL_PROPS } from "../../../../lib/constants/input";
import { useHotkeys } from "@mantine/hooks";

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
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useHotkeys(
    [
      ["mod+F", () => searchInputRef.current?.focus()],
      ["mod+shift+R", onRefresh],
      ["mod+shift+T", () => toggleViewMode()],
    ],
    [],
  );

  const toggleViewMode = () => {
    if (view === "tree") {
      setView("list");
      return;
    }
    setView("tree");
  };

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
        <Tooltip
          label={
            <DockTooltip
              label="Search"
              shortcut={{ modifiers: ["mod"], key: "F" }}
            />
          }
        >
          <TextInput
            flex={1}
            ref={searchInputRef}
            placeholder="Search requests..."
            leftSection={<IconSearch size={15} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            {...TEXT_INPUT_ADDITIONAL_PROPS}
          />
        </Tooltip>

        <Tooltip
          label={
            <DockTooltip
              label="Refresh"
              shortcut={{ modifiers: ["mod"], key: "R" }}
            />
          }
        >
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

      <Tooltip
        position="bottom"
        label={
          <DockTooltip
            label="Toggle view"
            shortcut={{ modifiers: ["mod", "shift"], key: "T" }}
          />
        }
      >
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
      </Tooltip>

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
