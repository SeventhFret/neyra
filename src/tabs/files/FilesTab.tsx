import {
  Badge,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  Tree,
  getTreeExpandedState,
  useTree,
  type TreeNodeData,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import {
  IconFile,
  IconFolder,
  IconFolderOpen,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRepoData, type StatusEntry } from "../../stores";
import { showAppNotification } from "../../components/NotificationCenter/helper";
import classes from "./FilesTab.module.css";
import ShortcutKeys from "../../components/ShortcutKeys/ShortcutKeys";

const STATUS_COLORS = {
  conflicted: "#da77f2",
  deleted: "#ff6b6b",
  added: "#51cf66",
  renamed: "#4dabf7",
  modified: "#ffd43b",
  untracked: "#d4d4d8",
} as const;

const FOLDER_COLOR = "#a1a1aa";

type StatusKind = keyof typeof STATUS_COLORS;

function statusKind(entry: StatusEntry): StatusKind {
  const codes = `${entry.indexStatus}${entry.worktreeStatus}`;

  if (codes.includes("U")) return "conflicted";
  if (codes.includes("D")) return "deleted";
  if (codes.includes("A")) return "added";
  if (codes.includes("R")) return "renamed";
  if (codes.includes("M")) return "modified";
  return "untracked";
}

function isStaged(entry: StatusEntry): boolean {
  return entry.indexStatus !== " " && entry.indexStatus !== "?";
}

interface NodeMeta {
  isDir: boolean;
  color: string;
  codes: string | null;
  staged: number;
  total: number;
}

interface RawNode {
  name: string;
  path: string;
  children: Map<string, RawNode>;
  entry?: StatusEntry;
}

function compareNodes(a: RawNode, b: RawNode): number {
  const aIsDir = a.children.size > 0;
  const bIsDir = b.children.size > 0;

  if (aIsDir !== bIsDir) {
    return aIsDir ? -1 : 1;
  }

  return a.name.localeCompare(b.name);
}

function buildTree(entries: StatusEntry[]): {
  data: TreeNodeData[];
  meta: Map<string, NodeMeta>;
} {
  const root: RawNode = { name: "", path: "", children: new Map() };

  for (const entry of entries) {
    const segments = entry.path.replace(/\/+$/, "").split("/");
    let node = root;

    segments.forEach((segment, index) => {
      let child = node.children.get(segment);
      if (!child) {
        child = {
          name: segment,
          path: segments.slice(0, index + 1).join("/"),
          children: new Map(),
        };
        node.children.set(segment, child);
      }

      if (index === segments.length - 1) {
        child.entry = entry;
      }

      node = child;
    });
  }

  const meta = new Map<string, NodeMeta>();

  const convert = (node: RawNode): TreeNodeData => {
    const children = [...node.children.values()]
      .sort(compareNodes)
      .map(convert);
    const isDir = children.length > 0;

    let staged = 0;
    let total = 0;

    if (isDir) {
      for (const child of children) {
        const childMeta = meta.get(child.value);
        staged += childMeta?.staged ?? 0;
        total += childMeta?.total ?? 0;
      }
    } else {
      total = 1;
      staged = node.entry && isStaged(node.entry) ? 1 : 0;
    }

    meta.set(node.path, {
      isDir,
      color: node.entry
        ? STATUS_COLORS[statusKind(node.entry)]
        : isDir
          ? FOLDER_COLOR
          : STATUS_COLORS.untracked,
      codes: node.entry
        ? `${node.entry.indexStatus}${node.entry.worktreeStatus}`.trim()
        : null,
      staged,
      total,
    });

    return {
      value: node.path,
      label: node.name,
      children: isDir ? children : undefined,
    };
  };

  return {
    data: [...root.children.values()].sort(compareNodes).map(convert),
    meta,
  };
}

interface FilesTabProps {
  active: boolean;
}

export default function FilesTab({ active }: FilesTabProps) {
  const status = useRepoData((state) => state.status);
  const isLoading = useRepoData((state) => state.isLoading);
  const refresh = useRepoData((state) => state.refresh);

  const [filter, setFilter] = useState<string>("");
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const filterInputRef = useRef<HTMLInputElement | null>(null);
  const isWorkingRef = useRef<boolean>(false);

  const { data, meta } = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const matching = query
      ? status.filter((entry) => entry.path.toLowerCase().includes(query))
      : status;

    return buildTree(matching);
  }, [status, filter]);

  const tree = useTree({
    initialExpandedState: getTreeExpandedState(data, "*"),
  });

  useEffect(() => {
    tree.expandAllNodes();
  }, [data]);

  const stagedCount = status.filter(isStaged).length;

  const run = useCallback(
    async (command: "stage" | "unstage", paths: string[] | null) => {
      if (isWorkingRef.current) {
        return;
      }

      isWorkingRef.current = true;
      setIsWorking(true);
      try {
        await invoke<string>(command, { paths });
        await refresh();
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
    [refresh],
  );

  const stageAll = useCallback(() => {
    if (status.length > 0) {
      void run("stage", null);
    }
  }, [run, status.length]);

  useHotkeys(
    active
      ? [
          ["mod+Enter", stageAll, { usePhysicalKeys: true }],
          [
            "mod+F",
            () => filterInputRef.current?.focus(),
            { usePhysicalKeys: true },
          ],
        ]
      : [],
    [],
  );

  return (
    <Stack px="xl" gap="md">
      <Group justify="space-between" align="flex-end" wrap="nowrap">
        <div className="header-container">
          <h1>Files</h1>
        </div>
        <Group gap="xs" pb="xs" wrap="nowrap" style={{ flex: "none" }}>
          <Badge size="lg" variant="light" radius="sm" color="teal">
            {stagedCount} staged
          </Badge>
          <Badge size="lg" variant="light" radius="sm" color="gray">
            {status.length} changed
          </Badge>
        </Group>
      </Group>

      <Group gap="sm" align="center">
        <TextInput
          radius="lg"
          ref={filterInputRef}
          placeholder="Filter by file name"
          leftSection={<IconSearch size={16} />}
          value={filter}
          onChange={(event) => setFilter(event.currentTarget.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <Button
          radius="md"
          variant="filled"
          leftSection={<IconPlus size={16} />}
          loading={isWorking}
          disabled={status.length === 0}
          onClick={stageAll}
        >
          Stage all
        </Button>
        <ShortcutKeys shortcut={{ modifiers: ["mod"], key: "Enter" }} />
      </Group>

      <Paper
        shadow="md"
        radius="lg"
        bg="var(--neyra-surface-1)"
        p="sm"
        style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex" }}
      >
        {isLoading && status.length === 0 ? (
          <Center style={{ flex: 1 }}>
            <Loader size="sm" />
          </Center>
        ) : data.length === 0 ? (
          <Center style={{ flex: 1 }} p="xl">
            <Stack align="center" gap="xs">
              <IconFolder
                size={34}
                stroke={1.7}
                color="var(--neyra-text-muted)"
              />
              <Text c="dimmed">
                {status.length === 0
                  ? "Working tree clean"
                  : "No files match that filter"}
              </Text>
            </Stack>
          </Center>
        ) : (
          <div className={classes.scroll} style={{ width: "100%" }}>
            <Tree
              data={data}
              tree={tree}
              levelOffset="lg"
              withLines
              renderNode={({ node, expanded, hasChildren, elementProps }) => {
                const nodeMeta = meta.get(node.value);
                const staged = nodeMeta?.staged ?? 0;
                const total = nodeMeta?.total ?? 0;
                const allStaged = total > 0 && staged === total;

                return (
                  <div
                    {...elementProps}
                    className={`${elementProps.className} ${classes.node}`}
                  >
                    {hasChildren ? (
                      expanded ? (
                        <IconFolderOpen
                          size={16}
                          color={FOLDER_COLOR}
                          style={{ flex: "none" }}
                        />
                      ) : (
                        <IconFolder
                          size={16}
                          color={FOLDER_COLOR}
                          style={{ flex: "none" }}
                        />
                      )
                    ) : (
                      <IconFile
                        size={16}
                        color={nodeMeta?.color}
                        style={{ flex: "none" }}
                      />
                    )}

                    <Text
                      size="sm"
                      ff="monospace"
                      c={nodeMeta?.color}
                      truncate
                      title={node.value}
                      style={{ minWidth: 0, flex: 1 }}
                    >
                      {node.label}
                    </Text>

                    {nodeMeta?.codes && (
                      <Text
                        size="xs"
                        ff="monospace"
                        fw={700}
                        c={nodeMeta.color}
                        style={{ flex: "none" }}
                      >
                        {nodeMeta.codes}
                      </Text>
                    )}

                    <Checkbox
                      className={`${classes.checkbox} ${
                        staged > 0 ? classes.checkboxStaged : ""
                      }`}
                      size="xs"
                      radius="sm"
                      checked={allStaged}
                      indeterminate={staged > 0 && !allStaged}
                      disabled={isWorking}
                      aria-label={`Stage ${node.value}`}
                      // Without this the click also toggles the folder open.
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        void run(
                          event.currentTarget.checked ? "stage" : "unstage",
                          [node.value],
                        )
                      }
                    />
                  </div>
                );
              }}
            />
          </div>
        )}
      </Paper>
    </Stack>
  );
}
