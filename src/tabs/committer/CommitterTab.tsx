import {
  TextInput,
  Button,
  Checkbox,
  Paper,
  Text,
  Stack,
  Group,
  Textarea,
  Kbd,
  Grid,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconGitCommit } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useRepoData } from "../../stores";
import { showErrorNotification, showSuccessNotification } from "../../utils";

export default function CommitterTab() {
  const refresh = useRepoData((state) => state.refresh);
  const [fullCommitMsg, setFullCommitMsg] = useState<string>("");
  const [commitType, setCommitType] = useState<string>("");
  const [commitScope, setCommitScope] = useState<string>("");
  const [commitMsg, setCommitMsg] = useState<string>("");
  const [commitSuffix, setCommitSuffix] = useState<string>("");
  const [commitDescription, setCommitDescription] = useState<string>("");
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

  const handleCommit = async () => {
    if (fullCommitMsg.length === 0 || isCommitting) {
      return;
    }

    setIsCommitting(true);
    try {
      const result = await invoke<string>("commit", {
        message: fullCommitMsg,
        push: pushToBranch,
        force_with_lease: forceWithLease,
      });
      await refresh();
      showSuccessNotification({
        title: "Commit is successful",
        message: result,
      });
    } catch (error) {
      showErrorNotification({ title: "Failed to commit", message: error });
    } finally {
      setIsCommitting(false);
    }
  };

  useHotkeys(
    [
      ["ctrl+Enter", handleCommit],
      ["ctrl+P", () => setPushToBranch((push) => !push)],
      ["ctrl+F", () => setForceWithLease((force) => !force)],
    ],
    [],
  );

  return (
    // One width authority for the whole tab: every row below stretches to this
    // Stack, so the preview and the fields line up on both edges.
    <Stack w="100%" px="xl" gap="md">
      <div className="header-container">
        <h1>Committer</h1>
      </div>
      <Paper c="#d4d4d8" bg="#252525" shadow="md" p="lg" radius="lg">
        <Text c={"#d4d4d8"} style={{ whiteSpace: "pre-wrap" }}>
          {fullCommitMsg.length > 0 ? fullCommitMsg : "..."}
        </Text>
      </Paper>
      {/* 12 columns keeps the original proportions while the gap comes out of
          the columns instead of overflowing the row like percentages did. */}
      <Grid gap="md" align="end">
        <Grid.Col span={2}>
          <TextInput
            size="lg"
            radius="lg"
            description="type"
            placeholder="feat"
            value={commitType}
            onChange={(event) => setCommitType(event.target.value)}
          />
        </Grid.Col>
        <Grid.Col span={2}>
          <TextInput
            size="lg"
            radius="lg"
            description="scope"
            placeholder="auth"
            value={commitScope}
            onChange={(event) => setCommitScope(event.target.value)}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            size="lg"
            radius="lg"
            description="message"
            placeholder="implemented cool stuff"
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
        autosize
        minRows={3}
      />
      <Stack gap="xs">
        <Checkbox
          checked={pushToBranch}
          onChange={(event) => setPushToBranch(event.currentTarget.checked)}
          label={
            <Group gap="xs">
              Push to current branch
              <code style={{ fontWeight: 600 }}>{currentBranch}</code>
              <div>
                <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">P</Kbd>
              </div>
            </Group>
          }
        />
        <Checkbox
          checked={forceWithLease}
          disabled={!pushToBranch}
          onChange={(event) => setForceWithLease(event.currentTarget.checked)}
          label={
            <Group gap="xs">
              Use
              <code style={{ fontWeight: 600 }}>--force-with-lease</code>
              flag
              <div>
                <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">F</Kbd>
              </div>
            </Group>
          }
        />
      </Stack>
      <Group gap="sm" mt="xs">
        <Button
          radius="lg"
          size="lg"
          leftSection={<IconGitCommit />}
          loading={isCommitting}
          onClick={handleCommit}
        >
          {pushToBranch
            ? forceWithLease
              ? "Commit & Force Push"
              : "Commit & Push"
            : "Commit"}
        </Button>
        <div>
          <Kbd size="sm">Ctrl</Kbd> + <Kbd size="sm">Enter</Kbd>
        </div>
      </Group>
    </Stack>
  );
}
