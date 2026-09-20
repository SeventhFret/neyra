import { Stack, Group, Title, Text, Paper } from "@mantine/core";
import classes from "./GitFlowsTab.module.css";

export default function GitFlowsTab() {
  return (
    <Stack className={classes.root} gap="md">
      <Group justify="space-between">
        <Stack gap={2}>
          <Title order={2}>Git Flows</Title>

          <Text size="sm" c="dimmed">
            Automate common Git workflows
          </Text>
        </Stack>
      </Group>

      <Paper className={classes.workspace} radius="lg"></Paper>
    </Stack>
  );
}
