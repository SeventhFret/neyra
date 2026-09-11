import { useState } from "react";
import {
  Text,
  Paper,
  Group,
  Kbd,
  Button,
  Checkbox,
  Badge,
  Stack,
} from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import SelectWithDescription from "../../components/SelectWithDescription";
import { showSuccessNotification, showErrorNotification } from "../../utils";
import { useHotkeys } from "@mantine/hooks";
import {
  IconCloudDownload,
  IconCloudDown,
  IconGitBranch,
  IconPlaylistX,
} from "@tabler/icons-react";
import { useRepoData } from "../../stores";

export default function StatusTab() {
  const status = useRepoData((state) => state.statusMessage);
  const remotes = useRepoData((state) => state.remotes);
  const refresh = useRepoData((state) => state.refresh);
  const currentBranch = useRepoData((state) => state.currentBranch);

  const [rebase, setRebase] = useState(false);
  const [remote, setRemote] = useState(
    remotes.length > 0 ? remotes[0].name : null,
  );
  const [isPulling, setIsPulling] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [pullOutput, setPullOutput] = useState("");

  const handlePull = async () => {
    setIsPulling(true);

    try {
      const result = await invoke<string>("pull", {
        rebase: rebase,
        branch: currentBranch,
        remote: remote,
      });
      await refresh();
      setPullOutput(result);
      showSuccessNotification({
        title: "Pull is successful",
        message: "Finished pulling",
      });
    } catch (error) {
      showErrorNotification({ title: "Failed to pull", message: error });
    } finally {
      setIsPulling(false);
    }
  };

  const handleFetch = async () => {
    setIsFetching(true);

    try {
      const result = await invoke<string>("fetch", {
        remote: remote,
      });
      await refresh();
      setPullOutput(result);
      showSuccessNotification({
        title: "Fetch is successful",
        message: "Finished fetching",
      });
    } catch (error) {
      showErrorNotification({ title: "Failed to fetch", message: error });
    } finally {
      setIsFetching(false);
    }
  };

  useHotkeys(
    [
      [
        "ctrl+alt+R",
        () => {
          setRebase((current) => !current);
        },
      ],
      ["ctrl+F", handleFetch],
      ["ctrl+enter", handlePull],
      ["ctrl+L", () => setPullOutput("")],
    ],
    [],
  );

  return (
    <Stack
      px="xl"
      style={{
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <Group align="center" wrap="nowrap">
        <div className="header-container">
          <h1>Status</h1>
        </div>
        <Group align="center" gap="xs" pb="xs" wrap="nowrap">
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: "grow",
          gap: "10px",
        }}
      >
        <Paper
          p="md"
          mih="300px"
          radius="lg"
          style={{ flex: 1, overflow: "hidden" }}
        >
          <Text
            size="sm"
            ff="'Fira Code', monospace"
            fw={500}
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              paddingBottom: "30px",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {String(status)}
          </Text>
        </Paper>
        <Paper
          p="md"
          mah="200px"
          radius="lg"
          style={{ flex: 1, overflow: "hidden" }}
        >
          <Text
            size="sm"
            ff="'Fira Code', monospace"
            fw={400}
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              paddingBottom: "30px",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {String(pullOutput)}
          </Text>
        </Paper>
        <Stack>
          <Group>
            <SelectWithDescription
              value={remote}
              onChange={setRemote}
              data={remotes.map((val) => ({
                value: val.name,
                label: val.name,
                description: val.fetchUrl,
              }))}
              placeholder={
                remotes.length > 0 ? remotes[0].name : "No remote found"
              }
            />
            <Checkbox
              checked={rebase}
              onChange={(event) => setRebase(event.currentTarget.checked)}
              label={
                <Group gap="xs">
                  Use
                  <code style={{ fontWeight: 600 }}>--rebase</code>
                  flag
                  <div>
                    <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">Alt</Kbd> +{" "}
                    <Kbd size="xs">R</Kbd>
                  </div>
                </Group>
              }
            />
          </Group>
          <Group>
            <Button
              radius="lg"
              variant="filled"
              size="lg"
              loading={isPulling}
              disabled={isPulling}
              leftSection={<IconCloudDownload />}
              onClick={handlePull}
            >
              {rebase ? "Pull & Rebase" : "Pull"}
            </Button>
            <div>
              <Kbd size="sm">Ctrl</Kbd> + <Kbd size="sm">Enter</Kbd>
            </div>
            <Button
              radius="lg"
              size="lg"
              variant="light"
              loading={isFetching}
              disabled={isFetching}
              leftSection={<IconCloudDown />}
              onClick={handleFetch}
            >
              Fetch
            </Button>
            <div>
              <Kbd size="sm">Ctrl</Kbd> + <Kbd size="sm">F</Kbd>
            </div>
            <Button
              radius="lg"
              size="lg"
              variant="subtle"
              leftSection={<IconPlaylistX />}
              onClick={() => setPullOutput("")}
            >
              Clear output
            </Button>
            <div>
              <Kbd size="sm">Ctrl</Kbd> + <Kbd size="sm">L</Kbd>
            </div>
          </Group>
        </Stack>
      </div>
    </Stack>
  );
}
