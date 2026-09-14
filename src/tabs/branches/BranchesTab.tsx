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
import { showAppNotification } from "../../components/NotificationCenter/helper";
import { formatRelativeTime } from "../../lib/time";
import classes from "./BranchesTab.module.css";

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
  canSwitch: boolean;
  onAction: (name: string, command: "switch" | "rebase") => void;
}) {
  return (
    <div
      className={`${classes.row} ${branch.isCurrent ? classes.current : ""}`}
    >
      <div
        className={`${classes.branchIcon} ${
          branch.isCurrent ? classes.branchIconCurrent : ""
        }`}
      >
        {branch.isRemote ? (
          <IconCloud size={16} />
        ) : (
          <IconGitBranch size={16} />
        )}
      </div>

      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Group gap="xs" wrap="nowrap">
          <Text
            fw={600}
            ff="monospace"
            c="var(--neyra-text-primary)"
            truncate
            title={branch.name}
            style={{ minWidth: 0 }}
          >
            {branch.name}
          </Text>

          {branch.isCurrent && (
            <Badge size="xs" radius="sm" variant="light" color="neyraBlue">
              current
            </Badge>
          )}

          {branch.ahead > 0 && (
            <Badge
              size="xs"
              radius="sm"
              variant="light"
              color="neyraCyan"
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
              color="yellow"
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
            · {formatRelativeTime(branch.date)}
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
                : "no local branch to switch to — fetch or create it first"
            }
            onClick={() => onAction(branch.name, "switch")}
          >
            Switch
          </Button>

          <Button
            size="xs"
            radius="md"
            variant="subtle"
            className={classes.dangerButton}
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

      <Paper radius="lg" p={0} className={classes.section}>
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

interface BranchesTabProps {
  active: boolean;
}

export default function BranchesTab({ active }: BranchesTabProps) {
  const branches = useRepoData((state) => state.branches);
  const currentBranch = useRepoData((state) => state.currentBranch);
  const isLoading = useRepoData((state) => state.isLoading);
  const refresh = useRepoData((state) => state.refresh);

  const filterInputRef = useRef<HTMLInputElement | null>(null);
  const newBranchRef = useRef<HTMLInputElement | null>(null);

  useHotkeys(
    active
      ? [
          [
            "ctrl+F",
            () => {
              filterInputRef.current?.focus();
            },
          ],
          [
            "ctrl+N",
            () => {
              newBranchRef.current?.focus();
            },
          ],
        ]
      : [],
    [],
  );

  const [filter, setFilter] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { local, remote, localNames } = useMemo(() => {
    const query = filter.trim().toLowerCase();

    const matching = query
      ? branches.filter((branch) => branch.name.toLowerCase().includes(query))
      : branches;

    return {
      local: matching.filter((branch) => !branch.isRemote),
      remote: matching.filter((branch) => branch.isRemote),
      localNames: new Set(
        branches
          .filter((branch) => !branch.isRemote)
          .map((branch) => branch.name),
      ),
    };
  }, [branches, filter]);

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

        showAppNotification({
          type: "info",
          title:
            command === "switch"
              ? `Switched to ${name}`
              : `Rebased onto ${name}`,
          message: result,
        });
      } catch (error) {
        showAppNotification({
          type: "error",
          title: `Failed to ${command} ${name}`,
          message: error,
          messageFormat: "code",
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
      const result = await invoke<string>("create_branch", {
        name,
      });

      await refresh();

      setNewBranch("");

      showAppNotification({
        type: "success",
        title: `Created ${name}`,
        message: result,
      });
    } catch (error) {
      showAppNotification({
        type: "error",
        title: `Failed to create ${name}`,
        message: error,
        messageFormat: "code",
      });
    } finally {
      finishWork();
    }
  };

  return (
    <Stack px="xl" gap="md">
      <Group justify="space-between" align="flex-end" wrap="nowrap">
        <div className="header-container">
          <h1>Branches</h1>
        </div>

        <Group gap="xs" pb="xs" wrap="nowrap" style={{ flex: "none" }}>
          <Badge
            size="lg"
            variant="light"
            radius="sm"
            color="neyraBlue"
            leftSection={<IconGitBranch size={16} />}
          >
            {currentBranch ?? "detached HEAD"}
          </Badge>
        </Group>
      </Group>

      <Group gap="sm" align="flex-end">
        <TextInput
          radius="lg"
          ref={newBranchRef}
          placeholder="new-branch-name"
          description="branches from the current HEAD"
          value={newBranch}
          onChange={(event) => setNewBranch(event.currentTarget.value)}
          onKeyDown={getHotkeyHandler([["Enter", handleCreate]])}
          style={{
            flex: 1,
            minWidth: 220,
          }}
        />

        <Button
          radius="md"
          variant="filled"
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
          leftSection={<IconSearch size={16} color="var(--neyra-text-muted)" />}
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
              <IconGitBranch
                size={34}
                stroke={1.7}
                className={classes.emptyIcon}
              />

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
