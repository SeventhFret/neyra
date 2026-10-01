import {
  Center,
  Checkbox,
  Loader,
  Stack,
  Text,
  TextInput,
  Tree,
  getTreeExpandedState,
  useTree,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconSearch,
} from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FileSystemIcon from "../../../../components/FileSystemIcon/FileSystemIcon";

import { TEXT_INPUT_ADDITIONAL_PROPS } from "../../../../lib/constants/input";
import { showAppNotification } from "../../../../components/NotificationCenter/helper";
import type { StatusEntry } from "../../../../stores/repoData/store.types";
import type { DiffSource } from "../../../../components/DiffViewer/DiffViewer.types";

import {
  buildChangesTree,
  hasStagedChange,
  hasUnstagedChange,
  STATUS_COLORS,
  type ChangesFileSelection,
} from "./ChangesFileTree.utils";

import classes from "./ChangesFileTree.module.css";

interface ChangesFileTreeProps {
  status: StatusEntry[];
  isLoading: boolean;
  selected: ChangesFileSelection | null;
  onSelect: (selection: ChangesFileSelection) => void;
  onRefresh: () => Promise<void>;
}

export default function ChangesFileTree({
  status,
  isLoading,
  selected,
  onSelect,
  onRefresh,
}: ChangesFileTreeProps) {
  const [filter, setFilter] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const isWorkingRef = useRef(false);

  const query = filter.trim().toLowerCase();

  const stagedEntries = useMemo(
    () =>
      status.filter(
        (entry) =>
          hasStagedChange(entry) &&
          (!query || entry.path.toLowerCase().includes(query)),
      ),
    [status, query],
  );

  const unstagedEntries = useMemo(
    () =>
      status.filter(
        (entry) =>
          hasUnstagedChange(entry) &&
          (!query || entry.path.toLowerCase().includes(query)),
      ),
    [status, query],
  );

  const run = useCallback(
    async (command: "stage" | "unstage", paths: string[] | null) => {
      if (isWorkingRef.current) {
        return;
      }

      isWorkingRef.current = true;
      setIsWorking(true);

      try {
        await invoke<string>(command, { paths });
        await onRefresh();
      } catch (error) {
        showAppNotification({
          type: "error",
          title: command === "stage" ? "Failed to stage" : "Failed to unstage",
          message: error,
        });
      } finally {
        isWorkingRef.current = false;
        setIsWorking(false);
      }
    },
    [onRefresh],
  );

  if (isLoading && status.length === 0) {
    return (
      <Center className={classes.state}>
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.search}>
        <TextInput
          {...TEXT_INPUT_ADDITIONAL_PROPS}
          size="sm"
          radius="md"
          placeholder="Filter changes"
          leftSection={<IconSearch size={15} />}
          value={filter}
          onChange={(event) => setFilter(event.currentTarget.value)}
        />
      </div>

      <div className={classes.scroll}>
        {status.length === 0 ? (
          <Center className={classes.state}>
            <Stack align="center" gap={4}>
              <IconFolder
                size={28}
                stroke={1.5}
                color="var(--neyra-text-muted)"
              />

              <Text size="sm" c="dimmed">
                Working tree clean
              </Text>
            </Stack>
          </Center>
        ) : stagedEntries.length === 0 && unstagedEntries.length === 0 ? (
          <Center className={classes.state}>
            <Text size="sm" c="dimmed">
              No files match that filter
            </Text>
          </Center>
        ) : (
          <>
            <ChangeSection
              title="Staged"
              source="staged"
              entries={stagedEntries}
              selected={selected}
              isWorking={isWorking}
              onSelect={onSelect}
              onToggle={(path) => void run("unstage", [path])}
            />

            <ChangeSection
              title="Changes"
              source="unstaged"
              entries={unstagedEntries}
              selected={selected}
              isWorking={isWorking}
              onSelect={onSelect}
              onToggle={(path) => void run("stage", [path])}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface ChangeSectionProps {
  title: string;
  source: DiffSource;
  entries: StatusEntry[];
  selected: ChangesFileSelection | null;
  isWorking: boolean;
  onSelect: (selection: ChangesFileSelection) => void;
  onToggle: (path: string) => void;
}

function ChangeSection({
  title,
  source,
  entries,
  selected,
  isWorking,
  onSelect,
  onToggle,
}: ChangeSectionProps) {
  const { data, meta } = useMemo(
    () => buildChangesTree(entries, source),
    [entries, source],
  );

  const tree = useTree({
    initialExpandedState: getTreeExpandedState(data, "*"),
  });

  const [opened, setOpened] = useState(true);

  useEffect(() => {
    tree.expandAllNodes();
  }, [data]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={classes.section}>
      <button
        type="button"
        className={classes.sectionHeader}
        onClick={() => setOpened((value) => !value)}
      >
        {opened ? (
          <IconChevronDown size={14} />
        ) : (
          <IconChevronRight size={14} />
        )}

        <span>{title}</span>

        <span className={classes.count}>{entries.length}</span>
      </button>

      {opened && (
        <Tree
          data={data}
          tree={tree}
          levelOffset="lg"
          renderNode={({ node, expanded, hasChildren, elementProps }) => {
            const nodeMeta = meta.get(node.value);
            const entry = nodeMeta?.entry;

            const isSelected =
              entry !== null &&
              entry !== undefined &&
              selected?.entry.path === entry.path &&
              selected.source === source;

            const status = nodeMeta?.status;
            const statusColor = status ? STATUS_COLORS[status] : undefined;

            return (
              <div
                {...elementProps}
                className={[
                  elementProps.className,
                  classes.node,
                  isSelected ? classes.selected : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={(event) => {
                  elementProps.onClick?.(event);

                  if (entry) {
                    onSelect({
                      entry,
                      source,
                    });
                  }
                }}
              >
                <span
                  className={`${classes.statusGutter} ${
                    !hasChildren ? classes.statusGutterVisible : ""
                  }`}
                  style={{
                    backgroundColor: statusColor,
                  }}
                />

                <FileSystemIcon
                  path={node.value}
                  directory={hasChildren}
                  expanded={expanded}
                  size={16}
                />

                <Text
                  size="sm"
                  ff="monospace"
                  truncate
                  title={node.value}
                  className={classes.label}
                >
                  {node.label}
                </Text>

                {!hasChildren && status && (
                  <span
                    className={classes.statusDot}
                    style={{
                      backgroundColor: statusColor,
                    }}
                    title={status}
                  />
                )}

                <Checkbox
                  className={classes.checkbox}
                  size="xs"
                  radius="sm"
                  checked={source === "staged"}
                  disabled={isWorking}
                  aria-label={
                    source === "staged"
                      ? `Unstage ${node.value}`
                      : `Stage ${node.value}`
                  }
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => onToggle(node.value)}
                />
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
