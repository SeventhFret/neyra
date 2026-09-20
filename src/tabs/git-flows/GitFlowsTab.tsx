import { Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";

import { useGitFlowsStore } from "../../stores/gitFlows/store";
import type { GitFlow } from "../../stores/gitFlows/store.types";

import GitFlowEditor from "./components/GitFlowEditor/GitFlowEditor";
import GitFlowsDetails from "./components/GitFlowDetails/GitFlowDetails";
import GitFlowsList from "./components/GitFlowsList/GitFlowsList";

import classes from "./GitFlowsTab.module.css";

export default function GitFlowsTab() {
  const initialize = useGitFlowsStore((state) => state.initialize);

  const [editorOpened, setEditorOpened] = useState(false);
  const [editingFlow, setEditingFlow] = useState<GitFlow | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const handleCreate = () => {
    setEditingFlow(null);
    setEditorOpened(true);
  };

  const handleEdit = (flow: GitFlow) => {
    setEditingFlow(flow);
    setEditorOpened(true);
  };

  const handleEditorClose = () => {
    setEditorOpened(false);
    setEditingFlow(null);
  };

  return (
    <>
      <Stack className={classes.root} gap="md">
        <Group justify="space-between">
          <Stack gap={2}>
            <Title order={2}>Git Flows</Title>

            <Text size="sm" c="dimmed">
              Automate common Git workflows
            </Text>
          </Stack>
        </Group>

        <Paper className={classes.workspace} radius="xl">
          <div className={classes.browser}>
            <GitFlowsList onCreate={handleCreate} />
          </div>

          <GitFlowsDetails onEdit={handleEdit} />
        </Paper>
      </Stack>

      <GitFlowEditor
        opened={editorOpened}
        flow={editingFlow}
        onClose={handleEditorClose}
      />
    </>
  );
}
