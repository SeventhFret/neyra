import {
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { getHotkeyHandler, useHotkeys } from "@mantine/hooks";
import {
  IconArrowDown,
  IconArrowUp,
  IconCloud,
  IconGitBranch,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useRepoData, type Branch } from "../../stores";
import {
  formatRelativeDate,
  showErrorNotification,
  showSuccessNotification,
} from "../../utils";
import classes from "./BranchesTab.module.css";

/** Memoised: a repo with hundreds of branches re-renders this list on every
 *  keystroke in the filter box otherwise. Props are primitives and stable
 *  callbacks so the comparison actually holds. */
const BranchRow = memo(function BranchRow({
  branch,
  isBusy,
  otherIsBusy,
  canSwitch,
  onAction,
}: {
  branch: Branch;
  isBusy: boolean;
  otherIsBusy: boolean;
  /** False for a remote branch with no local counterpart to switch to. */
  canSwitch: boolean;
  onAction: (name: string, command: "switch" | "rebase") => void;
}) {
  return (
    <div
      className={`${classes.row} ${branch.isCurrent ? classes.current : ""}`}
    >
      <div style={{ flex: "none", display: "flex" }}>
        {branch.isRemote ? (
          <IconCloud size={16} color="#6b6b6b" />
        ) : (
          <IconGitBranch
            size={16}
            color={
              branch.isCurrent
                ? "var(--mantine-primary-color-filled)"
                : "#6b6b6b"
            }
          />
        )}
      </div>

      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Group gap="xs" wrap="nowrap">
          {/* Native title rather than Mantine Tooltip throughout the row: each
              Tooltip mounts a floating-ui popover, and six per row across
              hundreds of branches is what made this list crawl. */}
          <Text
            fw={600}
            ff="monospace"
            c="#e4e4e7"
            truncate
            title={branch.name}
            style={{ minWidth: 0 }}
          >
            {branch.name}
          </Text>

          {branch.isCurrent && (
            <Badge size="xs" radius="sm" variant="light">
              current
            </Badge>
          )}

          {/* Ahead and behind are relative to the tracked upstream. */}
          {branch.ahead > 0 && (
            <Badge
              size="xs"
              radius="sm"
              variant="light"
              color="teal"
              leftSection={<IconArrowUp size={10} />}
              title={`${branch.ahead} commit(s) not pushed to ${branch.upstream}`}
            >
              {branch.ahead}
            </Badge>
          )}

          {branch.behind > 0 && (
            <Badge
              size="xs"
              radius="sm"
              variant="light"
              color="orange"
              leftSection={<IconArrowDown size={10} />}
              title={`${branch.behind} commit(s) on ${branch.upstream} not pulled`}
            >
              {branch.behind}
            </Badge>
          )}

          {branch.upstreamGone && (
            <Badge
              size="xs"
              radius="sm"
              variant="light"
              color="red"
              title={`${branch.upstream} no longer exists on the remote`}
            >
              gone
            </Badge>
          )}
        </Group>

        <Group gap={6} wrap="nowrap">
          <Text size="xs" ff="monospace" c="dimmed">
            {branch.shortHash}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {branch.subject}
          </Text>
          <Text size="xs" c="dimmed" style={{ flex: "none" }}>
            · {formatRelativeDate(branch.date)}
          </Text>
        </Group>
      </Stack>

      {!branch.isCurrent && (
        <Group gap={6} wrap="nowrap" className={classes.action}>
          <Button
            size="xs"
            radius="md"
            variant="light"
            loading={isBusy}
            disabled={otherIsBusy || !canSwitch}
            title={
              canSwitch
                ? `git switch ${branch.name}`
                : `no local branch to switch to — fetch or create it first`
            }
            onClick={() => onAction(branch.name, "switch")}
          >
            Switch
          </Button>
          <Button
            size="xs"
            radius="md"
            variant="subtle"
            color="orange"
            loading={isBusy}
            disabled={otherIsBusy}
            title={`git rebase ${branch.name} — replays the current branch onto this one`}
            onClick={() => onAction(branch.name, "rebase")}
          >
            Rebase
          </Button>
        </Group>
      )}
    </div>
  );
});

function BranchSection({
  label,
  branches,
  busy,
  localNames,
  onAction,
}: {
  label: string;
  branches: Branch[];
  busy: string | null;
  localNames: Set<string>;
  onAction: (name: string, command: "switch" | "rebase") => void;
}) {
  if (branches.length === 0) {
    return null;
  }

  return (
    <Stack gap="xs">
      <Group gap="xs" px="xs">
        <Text size="xs" c="dimmed" fw={700} className={classes.sectionLabel}>
          {label}
        </Text>
        <Text size="xs" c="dimmed">
          {branches.length}
        </Text>
      </Group>
      {/* No overflow: hidden here — clipping a scrolled subtree to a rounded
          rect forces a compositing mask, which is what blurs text mid-scroll in
          the Linux webview. The rows round their own outer corners instead. */}
      <Paper bg="#252525" shadow="md" radius="lg" p={0}>
        {branches.map((branch) => (
          <BranchRow
            key={branch.name}
            branch={branch}
            isBusy={busy === branch.name}
            otherIsBusy={busy !== null && busy !== branch.name}
            canSwitch={
              !branch.isRemote ||
              localNames.has(branch.name.split("/").slice(1).join("/"))
            }
            onAction={onAction}
          />
        ))}
      </Paper>
    </Stack>
  );
}

export default function BranchesTab() {
  const branches = useRepoData((state) => state.branches);
  const currentBranch = useRepoData((state) => state.currentBranch);
  const isLoading = useRepoData((state) => state.isLoading);
  const refresh = useRepoData((state) => state.refresh);
  const filterInputRef = useRef<HTMLInputElement | null>(null);
  const newBranchRef = useRef<HTMLInputElement | null>(null);

  useHotkeys(
    [
      [
        "ctrl+F",
        () => {
          filterInputRef?.current?.focus();
        },
      ],
      [
        "ctrl+N",
        () => {
          newBranchRef?.current?.focus();
        },
      ],
    ],
    [],
  );

  const [filter, setFilter] = useState<string>("");
  const [newBranch, setNewBranch] = useState<string>("");
  /** Name of the branch being switched to, or "" while creating one. */
  const [busy, setBusy] = useState<string | null>(null);

  const { local, remote, localNames } = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const matching = query
      ? branches.filter((branch) => branch.name.toLowerCase().includes(query))
      : branches;

    return {
      local: matching.filter((branch) => !branch.isRemote),
      remote: matching.filter((branch) => branch.isRemote),
      // Every local branch, not just the filtered ones: a remote row needs to
      // know whether its local counterpart exists regardless of the filter.
      localNames: new Set(
        branches.filter((branch) => !branch.isRemote).map((b) => b.name),
      ),
    };
  }, [branches, filter]);

  // Kept out of the busy state so the callback identity survives a re-render
  // and the memoised rows are not thrown away on every keystroke.
  const busyRef = useRef<string | null>(null);
  const startWork = (name: string) => {
    busyRef.current = name;
    setBusy(name);
  };
  const finishWork = () => {
    busyRef.current = null;
    setBusy(null);
  };

  const handleAction = useCallback(
    async (name: string, command: "switch" | "rebase") => {
      if (busyRef.current !== null) {
        return;
      }

      startWork(name);
      try {
        const result = await invoke<string>(
          command === "switch" ? "switch_branch" : "rebase",
          { branch: name },
        );
        await refresh();
        showSuccessNotification({
          title:
            command === "switch"
              ? `Switched to ${name}`
              : `Rebased onto ${name}`,
          message: result,
        });
      } catch (error) {
        showErrorNotification({
          title: `Failed to ${command} ${name}`,
          message: error,
        });
      } finally {
        finishWork();
      }
    },
    [refresh],
  );

  const handleCreate = async () => {
    const name = newBranch.trim();
    if (name.length === 0 || busyRef.current !== null) {
      return;
    }

    startWork("");
    try {
      const result = await invoke<string>("create_branch", { name });
      await refresh();
      setNewBranch("");
      showSuccessNotification({
        title: `Created ${name}`,
        message: result,
      });
    } catch (error) {
      showErrorNotification({
        title: `Failed to create ${name}`,
        message: error,
      });
    } finally {
      finishWork();
    }
  };

  return (
    <Stack h="100vh" px="xl" py="md" gap="md">
      <Group justify="space-between" align="flex-end" wrap="nowrap">
        <div className="header-container">
          <h1>Branches</h1>
        </div>
        <Group gap="xs" pb="xs" wrap="nowrap">
          <Badge
            size="lg"
            variant="light"
            fullWidth
            radius="sm"
            leftSection={<IconGitBranch size={16} />}
          >
            {currentBranch ?? "detached HEAD"}
          </Badge>
        </Group>
      </Group>

      {/* wrap="wrap" so a narrow window stacks these instead of pushing the
          buttons off the edge. */}
      <Group gap="sm" align="flex-end">
        <TextInput
          radius="lg"
          ref={newBranchRef}
          placeholder="new-branch-name"
          description="branches from the current HEAD"
          value={newBranch}
          onChange={(event) => setNewBranch(event.currentTarget.value)}
          onKeyDown={getHotkeyHandler([["Enter", handleCreate]])}
          style={{ flex: 1, minWidth: 220 }}
        />
        <Button
          radius="md"
          leftSection={<IconPlus size={16} />}
          loading={busy === ""}
          disabled={newBranch.trim().length === 0}
          onClick={handleCreate}
        >
          Create &amp; switch
        </Button>
        <TextInput
          radius="lg"
          ref={filterInputRef}
          placeholder="Filter branches"
          leftSection={<IconSearch size={16} />}
          value={filter}
          onChange={(event) => setFilter(event.currentTarget.value)}
          w={200}
        />
      </Group>

      <div className={classes.scroll}>
        {isLoading && branches.length === 0 ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : local.length === 0 && remote.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconGitBranch size={34} color="#4a4a4a" />
              <Text c="dimmed">
                {branches.length === 0
                  ? "No branches yet"
                  : "No branches match that filter"}
              </Text>
              {branches.length === 0 && (
                <Text size="xs" c="dimmed">
                  A branch appears once the repository has its first commit.
                </Text>
              )}
            </Stack>
          </Center>
        ) : (
          <Stack gap="lg" pb="md">
            <BranchSection
              label="Local"
              branches={local}
              busy={busy}
              localNames={localNames}
              onAction={handleAction}
            />
            <BranchSection
              label="Remote"
              branches={remote}
              busy={busy}
              localNames={localNames}
              onAction={handleAction}
            />
          </Stack>
        )}
      </div>
    </Stack>
  );
}
