import {
  Button,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconFolder,
  IconSearch,
  IconArrowRight,
  IconFolderSearch,
} from "@tabler/icons-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useMemo, useState } from "react";
import { repoName } from "../../lib/strings";

import neyraLogo from "../../assets/logo/neyra-logo-1024.png";

import {
  useRepoHistoryStore,
  useRepositorySelectionStore,
} from "../../stores/repoSelector/store";

import classes from "./NeyraRepoSelector.module.css";

export default function NeyraRepoSelector() {
  const selectRepo = useRepositorySelectionStore(
    (state) => state.selectRepository,
  );
  const repoHistory = useRepoHistoryStore((state) => state.repositories);
  const addRepoToHistory = useRepoHistoryStore((state) => state.addEntry);

  const [query, setQuery] = useState("");

  const filteredRepos = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return repoHistory;
    }

    return repoHistory.filter((path) => {
      const name = repoName(path).toLowerCase();
      const fullPath = path.toLowerCase();

      return name.includes(normalized) || fullPath.includes(normalized);
    });
  }, [query, repoHistory]);

  const handleOpen = async (path: string) => {
    await selectRepo(path);
  };

  const handleBrowse = async () => {
    const path = await open({
      directory: true,
      multiple: false,
      title: "Select Git repository",
    });

    if (!path) {
      return;
    }

    await selectRepo(path);
    addRepoToHistory(path);
  };

  return (
    <Stack p="xl" align="center" justify="center" h="100dvh" gap="xl">
      <Group gap="lg">
        <img
          src={neyraLogo}
          height={96}
          width={96}
          alt="Neyra"
          className={classes.logo}
        />

        <Stack gap={2}>
          <Title order={1}>Welcome to Neyra</Title>

          <Text size="lg" c="var(--neyra-text-muted)">
            Select a repository
          </Text>
        </Stack>
      </Group>

      <Paper className={classes.panel} radius="xl" p="md">
        <Stack gap="md">
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Filter repositories"
            leftSection={<IconSearch size={17} stroke={1.7} />}
          />

          {repoHistory.length === 0 ? (
            <Stack align="center" gap={4} py="xl">
              <IconFolder
                size={32}
                stroke={1.5}
                color="var(--neyra-text-muted)"
              />

              <Text c="dimmed">No recent repositories</Text>

              <Text size="xs" c="dimmed">
                Repositories you open will appear here.
              </Text>
            </Stack>
          ) : filteredRepos.length === 0 ? (
            <Text c="dimmed" ta="center" py="lg">
              No repositories match your search.
            </Text>
          ) : (
            <Stack gap="xs">
              {filteredRepos.map((path) => {
                const name = repoName(path);

                return (
                  <div key={path} className={classes.repoRow}>
                    <div className={classes.repoIcon}>
                      <IconFolder size={23} stroke={1.6} />
                    </div>

                    <Stack gap={1} className={classes.repoInfo}>
                      <Text fw={600} size="sm" truncate>
                        {name}
                      </Text>

                      <Text size="xs" c="dimmed" truncate title={path}>
                        {path}
                      </Text>
                    </Stack>

                    <Button
                      variant="light"
                      size="xs"
                      radius="md"
                      rightSection={<IconArrowRight size={14} stroke={1.7} />}
                      onClick={() => handleOpen(path)}
                    >
                      Open
                    </Button>
                  </div>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Group className={classes.buttonsBox} justify="flex-end">
        <Button
          variant="light"
          size="md"
          radius="md"
          leftSection={<IconFolderSearch size={20} stroke={1.7} />}
          onClick={handleBrowse}
        >
          Open from files
        </Button>
      </Group>
    </Stack>
  );
}
