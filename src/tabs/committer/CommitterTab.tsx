import {
  Autocomplete,
  AutocompleteProps,
  Badge,
  Button,
  Checkbox,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconCloudUpload, IconGitCommit, IconLink } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useMemo, useState } from "react";

import { useRepoData } from "../../stores";
import { showAppNotification } from "../../components/NotificationCenter/helper";
import { parsePullRequestAction } from "../../lib/git";
import ShortcutKeys from "../../components/ShortcutKeys/ShortcutKeys";

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

const SCOPE_PATTERN = /^\w+\(([^)]+)\)!?:/;

const TEXT_INPUT_PROPS = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
} as const;

interface CommitterTabProps {
  active: boolean;
}

export default function CommitterTab({ active }: CommitterTabProps) {
  const refresh = useRepoData((state) => state.refresh);
  const commits = useRepoData((state) => state.commits);
  const currentBranch = useRepoData((state) => state.currentBranch);

  const [commitType, setCommitType] = useState("");
  const [commitScope, setCommitScope] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [commitSuffix, setCommitSuffix] = useState("");
  const [commitDescription, setCommitDescription] = useState("");

  const [performCommit, setPerformCommit] = useState(true);
  const [pushToBranch, setPushToBranch] = useState(true);
  const [forceWithLease, setForceWithLease] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const fullCommitMsg = useMemo(() => {
    let message = "";

    if (commitType) {
      message += commitType;
    }

    if (commitScope) {
      message += `(${commitScope})`;
    }

    if (commitMsg) {
      if (commitType || commitScope) {
        message += ": ";
      }

      message += commitMsg;
    }

    if (commitSuffix) {
      message += ` [${commitSuffix}]`;
    }

    if (commitDescription) {
      message += `\n${commitDescription}`;
    }

    return message;
  }, [commitType, commitScope, commitMsg, commitSuffix, commitDescription]);

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

  const renderType: AutocompleteProps["renderOption"] = ({ option }) => {
    const color = TYPE_COLORS[option.value] ?? "gray";

    return (
      <Group gap="sm" wrap="nowrap" w="100%">
        <div
          style={{
            width: 86,
            flex: "0 0 86px",
            display: "flex",
          }}
        >
          <Badge
            size="sm"
            radius="sm"
            variant="light"
            color={color}
            ff="var(--mantine-font-family-monospace)"
            fw={700}
            style={{
              maxWidth: "none",
              overflow: "visible",
              textOverflow: "clip",
              whiteSpace: "nowrap",
            }}
          >
            {option.value}
          </Badge>
        </div>

        <Text size="xs" c="dimmed" style={{ minWidth: 0 }}>
          {COMMIT_TYPES[option.value]}
        </Text>
      </Group>
    );
  };

  const willPush = !performCommit || pushToBranch;
  const typeColor = TYPE_COLORS[commitType] ?? "gray";

  const resetFields = () => {
    setCommitMsg("");
    setCommitDescription("");
    setCommitScope("");
    setCommitSuffix("");
    setCommitType("");
  };

  const handleCommit = async () => {
    if (isCommitting || (performCommit && fullCommitMsg.length === 0)) {
      return;
    }

    setIsCommitting(true);

    try {
      const result = performCommit
        ? await invoke<string>("commit", {
            message: fullCommitMsg,
            push: pushToBranch,
            forceWithLease,
          })
        : await invoke<string>("push", {
            forceWithLease,
          });

      await refresh();
      resetFields();

      const prAction = parsePullRequestAction(result);

      showAppNotification({
        type: "success",
        title: performCommit ? "Commit is successful" : "Push is successful",
        message: result,
        messageFormat: "code",
        actions: prAction
          ? [
              {
                label:
                  prAction.kind === "create" ? "Create MR/PR" : "Open MR/PR",
                icon: IconLink,
                onClick: async () => {
                  await openUrl(prAction.url);
                },
              },
            ]
          : undefined,
      });
    } catch (error) {
      showAppNotification({
        type: "error",
        title: performCommit ? "Failed to commit" : "Failed to push",
        message: error,
        messageFormat: "code",
      });
    } finally {
      setIsCommitting(false);
    }
  };

  useHotkeys(
    active
      ? [
          ["mod+Enter", handleCommit, { usePhysicalKeys: true }],
          [
            "mod+shift+H",
            () => setPerformCommit((value) => !value),
            { usePhysicalKeys: true },
          ],
          [
            "mod+shift+P",
            () => setPushToBranch((value) => !value),
            { usePhysicalKeys: true },
          ],
          [
            "mod+F",
            () => setForceWithLease((value) => !value),
            { usePhysicalKeys: true },
          ],
        ]
      : [],
    [],
  );

  return (
    <Stack w="100%" px="xl" gap="md">
      <div className="header-container">
        <h1>Committer</h1>
      </div>

      <Paper bg="var(--neyra-surface-2)" shadow="md" p="lg" radius="lg">
        {performCommit ? (
          fullCommitMsg ? (
            <Stack gap={6}>
              <Text
                component="div"
                ff="var(--mantine-font-family-monospace)"
                size="md"
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {commitType && (
                  <Text component="span" inherit c={typeColor} fw={750}>
                    {commitType}
                  </Text>
                )}

                {commitScope && (
                  <Text
                    component="span"
                    inherit
                    c="var(--neyra-text-primary)"
                    fw={700}
                  >
                    ({commitScope})
                  </Text>
                )}

                {commitMsg && (
                  <>
                    {(commitType || commitScope) && (
                      <Text
                        component="span"
                        inherit
                        c="var(--neyra-text-muted)"
                      >
                        :{" "}
                      </Text>
                    )}

                    <Text
                      component="span"
                      inherit
                      c="var(--neyra-text-secondary)"
                      fw={500}
                    >
                      {commitMsg}
                    </Text>
                  </>
                )}

                {commitSuffix && (
                  <Text
                    component="span"
                    inherit
                    c="var(--neyra-text-muted)"
                    fw={550}
                  >
                    {" "}
                    [{commitSuffix}]
                  </Text>
                )}
              </Text>

              {commitDescription && (
                <Text
                  ff="var(--mantine-font-family-monospace)"
                  size="sm"
                  c="var(--neyra-text-muted)"
                  style={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {commitDescription}
                </Text>
              )}
            </Stack>
          ) : (
            <Text ff="var(--mantine-font-family-monospace)" c="dimmed">
              Start writing a commit message…
            </Text>
          )
        ) : (
          <Text ff="var(--mantine-font-family-monospace)" c="dimmed">
            No commit — pushing{" "}
            <Text
              component="span"
              inherit
              fw={700}
              c="var(--neyra-text-secondary)"
            >
              {currentBranch ?? "detached HEAD"}
            </Text>{" "}
            as it is
          </Text>
        )}
      </Paper>

      <Grid gap="md" align="end">
        <Grid.Col span={2}>
          <Autocomplete
            {...TEXT_INPUT_PROPS}
            size="lg"
            radius="lg"
            description="type"
            placeholder="feat"
            disabled={!performCommit}
            data={Object.keys(COMMIT_TYPES)}
            renderOption={renderType}
            value={commitType}
            onChange={setCommitType}
            comboboxProps={{
              width: 320,
              position: "bottom-start",
            }}
            maxDropdownHeight={300}
          />
        </Grid.Col>

        <Grid.Col span={2}>
          <Autocomplete
            {...TEXT_INPUT_PROPS}
            size="lg"
            radius="lg"
            description="scope"
            placeholder="auth"
            disabled={!performCommit}
            data={scopes}
            value={commitScope}
            onChange={setCommitScope}
            comboboxProps={{ size: "sm" }}
            maxDropdownHeight={300}
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <TextInput
            {...TEXT_INPUT_PROPS}
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
            {...TEXT_INPUT_PROPS}
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
        {...TEXT_INPUT_PROPS}
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
              <ShortcutKeys
                shortcut={{
                  modifiers: ["mod", "shift"],
                  key: "H",
                }}
              />
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
              <ShortcutKeys
                shortcut={{
                  modifiers: ["mod", "shift"],
                  key: "P",
                }}
              />
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
              <ShortcutKeys
                shortcut={{
                  modifiers: ["mod"],
                  key: "F",
                }}
              />
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

        <ShortcutKeys
          shortcut={{
            modifiers: ["mod"],
            key: "Enter",
          }}
        />
      </Group>
    </Stack>
  );
}
