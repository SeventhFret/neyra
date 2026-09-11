import {
  Autocomplete,
  AutocompleteProps,
  TextInput,
  Button,
  Checkbox,
  Paper,
  Text,
  Stack,
  Group,
  Textarea,
  Grid,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconCloudUpload, IconGitCommit } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import { useRepoData } from "../../stores";
import {
  showErrorNotification,
  showSuccessNotification,
  parseUrlFromCommitStatus,
} from "../../utils";
import ShortcutKeys from "../../components/ShortcutKeys/ShortcutKeys";

/** The Conventional Commits types, with what each one is for. */
const COMMIT_TYPES: Record<string, string> = {
  feat: "Adds a feature",
  fix: "Fixes a bug",
  refactor: "Neither fixes a bug nor adds a feature",
  perf: "Improves performance",
  docs: "Documentation only",
  test: "Adds or corrects tests",
  build: "Build system or dependencies",
  ci: "CI configuration or scripts",
  style: "Formatting only, no change in behaviour",
  chore: "Housekeeping, outside src and tests",
  revert: "Reverts an earlier commit",
};

/** Fallbacks for a repository whose log has no scopes to learn from yet. */
const COMMON_SCOPES = [
  "ui",
  "api",
  "auth",
  "config",
  "deps",
  "build",
  "ci",
  "docs",
  "tests",
  "release",
];

/** The `scope` of a `type(scope): subject` header. */
const SCOPE_PATTERN = /^\w+\(([^)]+)\)!?:/;

export default function CommitterTab() {
  const refresh = useRepoData((state) => state.refresh);
  const commits = useRepoData((state) => state.commits);
  const [fullCommitMsg, setFullCommitMsg] = useState<string>("");
  const [commitType, setCommitType] = useState<string>("");
  const [commitScope, setCommitScope] = useState<string>("");
  const [commitMsg, setCommitMsg] = useState<string>("");
  const [commitSuffix, setCommitSuffix] = useState<string>("");
  const [commitDescription, setCommitDescription] = useState<string>("");
  const [performCommit, setPerformCommit] = useState<boolean>(true);
  const [pushToBranch, setPushToBranch] = useState<boolean>(true);
  const [forceWithLease, setForceWithLease] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const currentBranch = useRepoData((state) => state.currentBranch);

  useEffect(() => {
    let newCommitMsg = "";

    if (commitType.length > 0) {
      newCommitMsg += commitType;
    }

    if (commitScope.length > 0) {
      newCommitMsg += `(${commitScope})`;
    }

    if (commitMsg.length > 0) {
      if (commitType.length > 0 || commitScope.length > 0) {
        newCommitMsg += `: `;
      }
      newCommitMsg += `${commitMsg}`;
    }

    if (commitSuffix.length > 0) {
      newCommitMsg += ` [${commitSuffix}]`;
    }

    if (commitDescription.length > 0) {
      newCommitMsg += `\n${commitDescription}`;
    }

    setFullCommitMsg(newCommitMsg);
  }, [commitMsg, commitScope, commitType, commitSuffix, commitDescription]);

  // Scopes this repository actually uses, newest first, since a canned list is
  // rarely the one a project settled on. The common ones fill in behind them.
  const scopes = useMemo(() => {
    const seen = new Set<string>();

    for (const commit of commits) {
      const scope = commit.subject.match(SCOPE_PATTERN)?.[1];
      if (scope) {
        seen.add(scope.trim());
      }
    }

    for (const scope of COMMON_SCOPES) {
      seen.add(scope);
    }

    return [...seen];
  }, [commits]);

  // The type's meaning is what makes the list worth having, so it goes in the
  // dropdown next to the type itself.
  const renderType: AutocompleteProps["renderOption"] = ({ option }) => (
    <div>
      <Text size="sm" fw={500}>
        {option.value}
      </Text>
      <Text size="xs" c="dimmed">
        {COMMIT_TYPES[option.value]}
      </Text>
    </div>
  );

  // Without a commit there is nothing left to do but push, so the push itself
  // is not optional in that mode.
  const willPush = !performCommit || pushToBranch;

  const handleCommit = async () => {
    if (isCommitting || (performCommit && fullCommitMsg.length === 0)) {
      return;
    }

    setIsCommitting(true);
    try {
      // Push-only goes to its own command rather than `commit` with an empty
      // message, which git refuses.
      const result = performCommit
        ? await invoke<string>("commit", {
            message: fullCommitMsg,
            push: pushToBranch,
            forceWithLease: forceWithLease,
          })
        : await invoke<string>("push", { forceWithLease: forceWithLease });
      await refresh();
      await resetFields();
      showSuccessNotification({
        title: performCommit ? "Commit is successful" : "Push is successful",
        message: result,
        prUrl: parseUrlFromCommitStatus(result),
      });
    } catch (error) {
      showErrorNotification({
        title: performCommit ? "Failed to commit" : "Failed to push",
        message: error,
      });
    } finally {
      setIsCommitting(false);
    }
  };

  useHotkeys(
    [
      ["ctrl+Enter", handleCommit],
      ["ctrl+H", () => setPerformCommit((commit) => !commit)],
      ["ctrl+P", () => setPushToBranch((push) => !push)],
      ["ctrl+F", () => setForceWithLease((force) => !force)],
    ],
    [],
  );

  const resetFields = async () => {
    setCommitMsg("");
    setCommitDescription("");
    setCommitScope("");
    setCommitSuffix("");
    setCommitType("");
  };

  return (
    // One width authority for the whole tab: every row below stretches to this
    // Stack, so the preview and the fields line up on both edges.
    <Stack w="100%" px="xl" gap="md">
      <div className="header-container">
        <h1>Committer</h1>
      </div>
      <Paper
        c="#d4d4d8"
        bg="var(--neyra-surface-2)"
        shadow="md"
        p="lg"
        radius="lg"
      >
        <Text
          c={performCommit ? "#d4d4d8" : "dimmed"}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {performCommit
            ? fullCommitMsg.length > 0
              ? fullCommitMsg
              : "..."
            : `No commit — pushing ${currentBranch ?? "detached HEAD"} as it is`}
        </Text>
      </Paper>
      {/* 12 columns keeps the original proportions while the gap comes out of
          the columns instead of overflowing the row like percentages did. */}
      <Grid gap="md" align="end">
        <Grid.Col span={2}>
          {/* Autocomplete rather than Select: the list is a shortcut, not a
              constraint — anything typed that is not in it is kept as is. */}
          <Autocomplete
            size="lg"
            radius="lg"
            description="type"
            placeholder="feat"
            disabled={!performCommit}
            data={Object.keys(COMMIT_TYPES)}
            renderOption={renderType}
            value={commitType}
            onChange={setCommitType}
            comboboxProps={{ width: 320, position: "bottom-start" }}
            maxDropdownHeight={300}
          />
        </Grid.Col>
        <Grid.Col span={2}>
          <Autocomplete
            size="lg"
            radius="lg"
            description="scope"
            placeholder="auth"
            disabled={!performCommit}
            data={scopes}
            value={commitScope}
            onChange={setCommitScope}
            // The list is long and every entry is one word, so it does not need
            // the dropdown to follow the field's own size.
            comboboxProps={{ size: "sm" }}
            maxDropdownHeight={300}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            size="lg"
            radius="lg"
            description="message"
            placeholder="implemented cool stuff"
            disabled={!performCommit}
            value={commitMsg}
            onChange={(event) => setCommitMsg(event.target.value)}
          />
        </Grid.Col>
        <Grid.Col span={2}>
          <TextInput
            size="lg"
            radius="lg"
            description="suffix"
            placeholder="TCKT-100"
            disabled={!performCommit}
            value={commitSuffix}
            onChange={(event) => setCommitSuffix(event.target.value)}
          />
        </Grid.Col>
      </Grid>
      <Textarea
        description="description"
        value={commitDescription}
        onChange={(event) => setCommitDescription(event.target.value)}
        size="lg"
        radius="lg"
        disabled={!performCommit}
        autosize
        minRows={3}
      />
      <Stack gap="xs">
        <Checkbox
          checked={performCommit}
          onChange={(event) => setPerformCommit(event.currentTarget.checked)}
          label={
            <Group gap="xs">
              Perform commit
              <ShortcutKeys shortcut={{ modifiers: ["mod"], key: "H" }} />
            </Group>
          }
        />
        <Checkbox
          checked={willPush}
          disabled={!performCommit}
          onChange={(event) => setPushToBranch(event.currentTarget.checked)}
          label={
            <Group gap="xs">
              Push to current branch
              <code style={{ fontWeight: 600 }}>{currentBranch}</code>
              <ShortcutKeys shortcut={{ modifiers: ["mod"], key: "P" }} />
            </Group>
          }
        />
        <Checkbox
          checked={forceWithLease}
          disabled={!willPush}
          onChange={(event) => setForceWithLease(event.currentTarget.checked)}
          label={
            <Group gap="xs">
              Use
              <code style={{ fontWeight: 600 }}>--force-with-lease</code>
              flag
              <ShortcutKeys shortcut={{ modifiers: ["mod"], key: "F" }} />
            </Group>
          }
        />
      </Stack>
      <Group gap="sm" mt="xs">
        <Button
          radius="lg"
          size="lg"
          variant="filled"
          leftSection={performCommit ? <IconGitCommit /> : <IconCloudUpload />}
          loading={isCommitting}
          onClick={handleCommit}
        >
          {performCommit
            ? pushToBranch
              ? forceWithLease
                ? "Commit & Force Push"
                : "Commit & Push"
              : "Commit"
            : forceWithLease
              ? "Force Push"
              : "Push"}
        </Button>
        <ShortcutKeys shortcut={{ modifiers: ["mod"], key: "Enter" }} />
      </Group>
    </Stack>
  );
}
