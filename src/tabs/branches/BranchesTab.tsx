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
  Tooltip,
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
import { useMemo, useRef, useState } from "react";
import { useRepoData, type Branch } from "../../stores";
import {
  formatRelativeDate,
  showErrorNotification,
  showSuccessNotification,
} from "../../utils";
import classes from "./BranchesTab.module.css";

function BranchRow({
  branch,
  busy,
  onMove,
}: {
  branch: Branch;
  busy: string | null;
  onMove: (name: string, command: "switch" | "checkout") => void;
}) {
  const isBusy = busy === branch.name;
  const otherIsBusy = busy !== null && !isBusy;

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
          {/* Long names truncate rather than widen the row past the window. */}
          <Tooltip label={branch.name} withArrow openDelay={400}>
            <Text
              fw={600}
              ff="monospace"
              c="#e4e4e7"
              truncate
              style={{ minWidth: 0 }}
            >
              {branch.name}
            </Text>
          </Tooltip>

          {branch.isCurrent && (
            <Badge size="xs" radius="sm" variant="light">
              current
            </Badge>
          )}

          {/* Ahead and behind are relative to the tracked upstream. */}
          {branch.ahead > 0 && (
            <Tooltip
              label={`${branch.ahead} commit(s) not pushed to ${branch.upstream}`}
              withArrow
            >
              <Badge
                size="xs"
                radius="sm"
                variant="light"
                color="teal"
                leftSection={<IconArrowUp size={10} />}
              >
                {branch.ahead}
              </Badge>
            </Tooltip>
          )}

          {branch.behind > 0 && (
            <Tooltip
              label={`${branch.behind} commit(s) on ${branch.upstream} not pulled`}
              withArrow
            >
              <Badge
                size="xs"
                radius="sm"
                variant="light"
                color="orange"
                leftSection={<IconArrowDown size={10} />}
              >
                {branch.behind}
              </Badge>
            </Tooltip>
          )}

          {branch.upstreamGone && (
            <Tooltip
              label={`${branch.upstream} no longer exists on the remote`}
              withArrow
            >
              <Badge size="xs" radius="sm" variant="light" color="red">
                gone
              </Badge>
            </Tooltip>
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
          <Tooltip
            label={
              branch.isRemote
                ? `git switch --track ${branch.name}`
                : `git switch ${branch.name}`
            }
            withArrow
          >
            <Button
              size="xs"
              radius="md"
              variant="light"
              loading={isBusy}
              disabled={otherIsBusy}
              onClick={() => onMove(branch.name, "switch")}
            >
              Switch
            </Button>
          </Tooltip>
          <Tooltip
            label={
              branch.isRemote
                ? `git checkout --track ${branch.name}`
                : `git checkout ${branch.name}`
            }
            withArrow
          >
            <Button
              size="xs"
              radius="md"
              variant="subtle"
              color="gray"
              loading={isBusy}
              disabled={otherIsBusy}
              onClick={() => onMove(branch.name, "checkout")}
            >
              Checkout
            </Button>
          </Tooltip>
        </Group>
      )}
    </div>
  );
}

function BranchSection({
  label,
  branches,
  busy,
  onMove,
}: {
  label: string;
  branches: Branch[];
  busy: string | null;
  onMove: (name: string, command: "switch" | "checkout") => void;
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
            busy={busy}
            onMove={onMove}
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

  const { local, remote } = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const matching = query
      ? branches.filter((branch) => branch.name.toLowerCase().includes(query))
      : branches;

    return {
      local: matching.filter((branch) => !branch.isRemote),
      remote: matching.filter((branch) => branch.isRemote),
    };
  }, [branches, filter]);

  const handleMove = async (name: string, command: "switch" | "checkout") => {
    if (busy !== null) {
      return;
    }

    setBusy(name);
    try {
      const result = await invoke<string>(`${command}_branch`, {
        branch: name,
      });
      await refresh();
      showSuccessNotification({
        title: `${command === "switch" ? "Switched" : "Checked out"} ${name}`,
        message: result,
      });
    } catch (error) {
      showErrorNotification({
        title: `Failed to ${command} ${name}`,
        message: error,
      });
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = async (checkout: boolean) => {
    const name = newBranch.trim();
    if (name.length === 0 || busy !== null) {
      return;
    }

    setBusy("");
    try {
      const result = await invoke<string>("create_branch", { name, checkout });
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
      setBusy(null);
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
          onKeyDown={getHotkeyHandler([["Enter", () => handleCreate(false)]])}
          style={{ flex: 1, minWidth: 220 }}
        />
        <Button
          radius="md"
          leftSection={<IconPlus size={16} />}
          loading={busy === ""}
          disabled={newBranch.trim().length === 0}
          onClick={() => handleCreate(false)}
        >
          Create &amp; switch
        </Button>
        <Button
          radius="md"
          variant="light"
          leftSection={<IconPlus size={16} />}
          loading={busy === ""}
          disabled={newBranch.trim().length === 0}
          onClick={() => handleCreate(true)}
        >
          Create &amp; checkout
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
              onMove={handleMove}
            />
            <BranchSection
              label="Remote"
              branches={remote}
              busy={busy}
              onMove={handleMove}
            />
          </Stack>
        )}
      </div>
    </Stack>
  );
}
