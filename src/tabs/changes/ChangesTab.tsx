import {
  Badge,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconFileDiff } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";

import DiffViewer from "../../components/DiffViewer/DiffViewer";
import type {
  DiffSource,
  FileDiff,
} from "../../components/DiffViewer/DiffViewer.types";

import { useRepoDataStore } from "../../stores/repoData/store";

import ChangesFileTree from "./components/ChangesFileTree/ChangesFileTree";
import {
  hasStagedChange,
  hasUnstagedChange,
  type ChangesFileSelection,
} from "./components/ChangesFileTree/ChangesFileTree.utils";

import classes from "./ChangesTab.module.css";

export default function ChangesTab() {
  const status = useRepoDataStore((state) => state.status);
  const isLoading = useRepoDataStore((state) => state.isLoading);
  const refresh = useRepoDataStore((state) => state.refresh);

  const [selected, setSelected] = useState<ChangesFileSelection | null>(null);

  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [isDiffLoading, setIsDiffLoading] = useState(false);

  const stagedCount = useMemo(
    () => status.filter(hasStagedChange).length,
    [status],
  );

  const unstagedCount = useMemo(
    () => status.filter(hasUnstagedChange).length,
    [status],
  );

  useEffect(() => {
    if (!selected) {
      setDiff(null);
      return;
    }

    const currentEntry = status.find(
      (entry) => entry.path === selected.entry.path,
    );

    if (!currentEntry) {
      setSelected(null);
      setDiff(null);
      return;
    }

    const stillExists =
      selected.source === "staged"
        ? hasStagedChange(currentEntry)
        : hasUnstagedChange(currentEntry);

    if (!stillExists) {
      const otherSource: DiffSource =
        selected.source === "staged" ? "unstaged" : "staged";

      const existsOnOtherSide =
        otherSource === "staged"
          ? hasStagedChange(currentEntry)
          : hasUnstagedChange(currentEntry);

      if (existsOnOtherSide) {
        setSelected({
          entry: currentEntry,
          source: otherSource,
        });
      } else {
        setSelected(null);
        setDiff(null);
      }

      return;
    }

    if (currentEntry !== selected.entry) {
      setSelected({
        entry: currentEntry,
        source: selected.source,
      });
    }
  }, [status, selected]);

  useEffect(() => {
    if (!selected) {
      setDiff(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsDiffLoading(true);

      try {
        const result = await invoke<FileDiff | null>("get_file_diff", {
          path: selected.entry.path,
          source: selected.source,
        });

        if (!cancelled) {
          setDiff(result);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Cannot load diff:", error);
          setDiff(null);
        }
      } finally {
        if (!cancelled) {
          setIsDiffLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [selected?.entry.path, selected?.source]);

  return (
    <Stack px="xl" gap="md" className={classes.root}>
      <Group justify="space-between" align="flex-end" wrap="nowrap">
        <div className="header-container">
          <h1>Changes</h1>
        </div>

        <Group gap="xs" pb="xs" wrap="nowrap" style={{ flex: "none" }}>
          <Badge size="md" variant="light" radius="sm" color="teal">
            {stagedCount} staged
          </Badge>

          <Badge size="md" variant="light" radius="sm" color="gray">
            {unstagedCount} changed
          </Badge>
        </Group>
      </Group>

      <div className={classes.workspace}>
        <Paper
          radius="lg"
          bg="var(--neyra-surface-1)"
          className={classes.sidebar}
        >
          <ChangesFileTree
            status={status}
            isLoading={isLoading}
            selected={selected}
            onSelect={setSelected}
            onRefresh={refresh}
          />
        </Paper>

        <div className={classes.viewer}>
          {!selected ? (
            <Center className={classes.empty}>
              <Stack align="center" gap="xs">
                <IconFileDiff
                  size={34}
                  stroke={1.5}
                  color="var(--neyra-text-muted)"
                />

                <Text size="sm" c="dimmed">
                  Select a file to view its changes
                </Text>
              </Stack>
            </Center>
          ) : isDiffLoading ? (
            <Center className={classes.empty}>
              <Loader size="sm" />
            </Center>
          ) : diff ? (
            <DiffViewer diff={diff} />
          ) : (
            <Center className={classes.empty}>
              <Text size="sm" c="dimmed">
                No diff available
              </Text>
            </Center>
          )}
        </div>
      </div>
    </Stack>
  );
}
