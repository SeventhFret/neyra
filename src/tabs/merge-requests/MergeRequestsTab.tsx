import { Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useEffect } from "react";

import { useMergeRequestsStore } from "../../stores/mergeRequests/store";

import MergeRequestsBrowser from "./components/MergeRequestsBrowser/MergeRequestsBrowser";
import MergeRequestsDetails from "./components/MergeRequestsDetails/MergeRequestsDetails";

import classes from "./MergeRequestsTab.module.css";

export default function MergeRequestsTab() {
  const mergeRequests = useMergeRequestsStore((state) => state.mergeRequests);
  const selected = useMergeRequestsStore((state) => state.selected);
  const loading = useMergeRequestsStore((state) => state.loading);
  const initialize = useMergeRequestsStore((state) => state.initialize);
  const refresh = useMergeRequestsStore((state) => state.refresh);
  const select = useMergeRequestsStore((state) => state.select);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Stack className={classes.root} gap="md">
      <Group justify="space-between">
        <Stack gap={2}>
          <Title order={2}>Merge / Pull requests</Title>

          <Text size="sm" c="dimmed">
            {loading && mergeRequests.length === 0
              ? "Loading requests..."
              : `${mergeRequests.length} open across your Git providers`}
          </Text>
        </Stack>
      </Group>

      <Paper className={classes.workspace} radius="lg">
        <div className={classes.browser}>
          <MergeRequestsBrowser
            requests={mergeRequests}
            selected={selected}
            loading={loading}
            onSelect={select}
            onRefresh={refresh}
          />
        </div>

        <MergeRequestsDetails request={selected} />
      </Paper>
    </Stack>
  );
}
