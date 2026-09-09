import {
  ActionIcon,
  Avatar,
  Badge,
  Center,
  CopyButton,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconCheck,
  IconCopy,
  IconGitBranch,
  IconGitCommit,
} from "@tabler/icons-react";
import { useRepoData, type Commit } from "../../stores";
import { formatRelativeDate } from "../../utils";
import classes from "./LogTab.module.css";

/** Conventional commit types, coloured so the log scans by kind of change. */
const TYPE_COLORS: Record<string, string> = {
  feat: "teal",
  fix: "red",
  refactor: "violet",
  perf: "orange",
  docs: "blue",
  test: "yellow",
  chore: "gray",
  build: "cyan",
  ci: "cyan",
  style: "pink",
  revert: "grape",
};

interface ParsedSubject {
  type: string | null;
  scope: string | null;
  text: string;
  suffix: string | null;
}

/** Splits `type(scope): message [SUFFIX]` — the shape the Committer tab writes.
 *  Anything that does not match is shown verbatim as the message. */
function parseSubject(subject: string): ParsedSubject {
  const conventional = /^(\w+)(?:\(([^)]*)\))?!?:\s*(.*)$/.exec(subject);
  const rest = conventional ? conventional[3] : subject;
  const suffix = /\s*\[([^\]]+)\]\s*$/.exec(rest);

  return {
    type: conventional ? conventional[1].toLowerCase() : null,
    scope: conventional?.[2] ?? null,
    text: suffix ? rest.slice(0, suffix.index) : rest,
    suffix: suffix?.[1] ?? null,
  };
}

function CommitRow({ commit }: { commit: Commit }) {
  const { type, scope, text, suffix } = parseSubject(commit.subject);
  const color = (type && TYPE_COLORS[type]) ?? "gray";

  return (
    <div className={classes.row}>
      <div className={classes.rail}>
        <span
          className={classes.dot}
          style={{ backgroundColor: `var(--mantine-color-${color}-6)` }}
        />
      </div>

      <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
        <Group gap="xs">
          {type && (
            <Badge size="sm" radius="sm" variant="light" color={color}>
              {scope ? `${type}(${scope})` : type}
            </Badge>
          )}
          <Text fw={600} c="#e4e4e7" style={{ overflowWrap: "anywhere" }}>
            {text}
          </Text>
          {suffix && (
            <Badge size="sm" radius="sm" variant="outline" color="gray">
              {suffix}
            </Badge>
          )}
        </Group>

        {commit.refName && (
          <Group gap="xs">
            <Badge size="sm" radius="sm" color="blue" variant="light" leftSection={<IconGitBranch size={12} />}>
              {commit.refName}
            </Badge>
          </Group>
        )}

        {commit.body.length > 0 && (
          <Text
            size="sm"
            c="dimmed"
            lineClamp={3}
            style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            {commit.body}
          </Text>
        )}

        <Group gap="xs" wrap="nowrap">
          <Avatar
            size={30}
            radius="xl"
            name={commit.authorName}
            color="initials"
          />
          <Text size="xs" c="dimmed">
            {commit.authorName}
          </Text>
          <Text size="xs" c="dimmed">
            ·
          </Text>
          <Tooltip label={new Date(commit.date).toLocaleString()} withArrow>
            <Text size="xs" c="dimmed">
              {formatRelativeDate(commit.date)}
            </Text>
          </Tooltip>
          <Text size="xs" c="dimmed">
            ·
          </Text>
          <Text size="xs" ff="monospace" c="dimmed">
            {commit.shortHash}
          </Text>
          <CopyButton value={commit.hash}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? "Copied" : "Copy full hash"} withArrow>
                <ActionIcon
                  className={classes.copy}
                  size="sm"
                  variant="subtle"
                  color={copied ? "teal" : "gray"}
                  onClick={copy}
                >
                  {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      </Stack>
    </div>
  );
}

export default function LogTab() {
  const commits = useRepoData((state) => state.commits);
  const currentBranch = useRepoData((state) => state.currentBranch);
  const isLoading = useRepoData((state) => state.isLoading);
  const error = useRepoData((state) => state.error);

  console.log(commits)

  // 100vh with the list scrolling inside it: the body has overflow hidden, so
  // the page itself must never grow past the window.
  return (
    <Stack h="100vh" px="xl" py="md" gap="md">
      <Group justify="space-between" align="flex-end" wrap="nowrap">
        <div className="header-container">
          <h1>Log</h1>
        </div>
        <Group gap="xs" pb="xs" wrap="nowrap" style={{ flex: "none" }}>
          <Badge
            variant="light"
            radius="sm"
            leftSection={<IconGitBranch size={14} />}
          >
            {currentBranch ?? "detached HEAD"}
          </Badge>
          <Text size="sm" c="dimmed">
            {commits.length === 1 ? "1 commit" : `${commits.length} commits`}
          </Text>
        </Group>
      </Group>

      <Paper
        bg="#252525"
        shadow="md"
        radius="lg"
        p={0}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isLoading && commits.length === 0 ? (
          <Center style={{ flex: 1 }}>
            <Loader size="sm" />
          </Center>
        ) : error ? (
          <Center style={{ flex: 1 }} p="xl">
            <Text
              size="sm"
              c="red.5"
              ta="center"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {error}
            </Text>
          </Center>
        ) : commits.length === 0 ? (
          <Center style={{ flex: 1 }} p="xl">
            <Stack align="center" gap="xs">
              <IconGitCommit size={34} color="#4a4a4a" />
              <Text c="dimmed">No commits yet</Text>
              <Text size="xs" c="dimmed">
                The first one you make in the Committer tab shows up here.
              </Text>
            </Stack>
          </Center>
        ) : (
          <div className={classes.list}>
            {commits.map((commit) => (
              <CommitRow key={commit.hash} commit={commit} />
            ))}
          </div>
        )}
      </Paper>
    </Stack>
  );
}
