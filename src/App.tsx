import { Tabs, Kbd, Group, CopyButton, ActionIcon } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { exit } from "@tauri-apps/plugin-process";
import { useEffect, useState } from "react";
import CommitterTab from "./tabs/committer/CommitterTab";
import StatusTab from "./tabs/status/StatusTab";
import {
  IconGitCherryPick,
  IconSubtitles,
  IconListDetails,
  IconGitBranch,
  IconRefresh,
  IconClipboard,
  IconClipboardCheck,
  IconFolder,
  IconDoorExit,
} from "@tabler/icons-react";
import { useRepoData } from "./stores";
import "./App.css";
import LogTab from "./tabs/log/LogTab";
import BranchesTab from "./tabs/branches/BranchesTab";
import FilesTab from "./tabs/files/FilesTab";

function App() {
  const [currentTab, setCurrentTab] = useState<string | null>("committer");
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useRepoData((state) => state.refresh);
  const currentBranch = useRepoData((state) => state.currentBranch);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Empty tagsToIgnore so the shortcuts also work while an input is focused
  useHotkeys(
    [
      ["ctrl+T", () => setCurrentTab("status")],
      ["ctrl+C", () => setCurrentTab("committer")],
      ["ctrl+B", () => setCurrentTab("branches")],
      ["ctrl+E", () => setCurrentTab("log")],
      ["ctrl+D", () => setCurrentTab("files")],
      [
        "ctrl+R",
        () => {
          setRefreshing(true);
          refresh();
          setRefreshing(false);
        },
      ],
      ["ctrl+Q", async () => await exit(0)],
    ],
    [],
  );

  return (
    <main className="container">
      <Tabs
        variant="pills"
        orientation="vertical"
        value={currentTab}
        onChange={setCurrentTab}
        radius="lg"
        h="100vh"
        w="100%"
        // The panel is a flex item and Mantine only sets flex-grow on it, so its
        // automatic minimum size is its content width — long branch names would
        // stretch it past the window and push content off the right edge.
        styles={{ panel: { minWidth: 0, overflow: "hidden" } }}
      >
        <Tabs.List justify="center">
          <Tabs.Tab
            value="status"
            leftSection={<IconSubtitles />}
            rightSection={
              <div>
                <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">T</Kbd>
              </div>
            }
          >
            Status
          </Tabs.Tab>
          <Tabs.Tab
            value="committer"
            leftSection={<IconGitCherryPick />}
            rightSection={
              <div>
                <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">C</Kbd>
              </div>
            }
          >
            Committer
          </Tabs.Tab>
          <Tabs.Tab
            value="branches"
            leftSection={<IconGitBranch />}
            rightSection={
              <div>
                <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">B</Kbd>
              </div>
            }
          >
            Branches
          </Tabs.Tab>
          <Tabs.Tab
            value="log"
            leftSection={<IconListDetails />}
            rightSection={
              <div>
                <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">E</Kbd>
              </div>
            }
          >
            Log
          </Tabs.Tab>
          <Tabs.Tab
            value="files"
            leftSection={<IconFolder />}
            rightSection={
              <div>
                <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">D</Kbd>
              </div>
            }
          >
            Files
          </Tabs.Tab>
          <Group mt="auto" px="xs" py="xs" justify="center">
            <ActionIcon
              loading={refreshing}
              size="lg"
              onClick={() => {
                setRefreshing(true);
                refresh();
                setRefreshing(false);
              }}
            >
              <IconRefresh />
            </ActionIcon>
            <CopyButton value={currentBranch ?? "no branch"}>
              {({ copied, copy }) => (
                <ActionIcon
                  size="lg"
                  color={copied ? "teal" : "blue"}
                  onClick={copy}
                >
                  {copied ? <IconClipboardCheck /> : <IconClipboard />}
                </ActionIcon>
              )}
            </CopyButton>
            <ActionIcon
              size="lg"
              color="red"
              onClick={async () => {
                await exit(0);
              }}
            >
              <IconDoorExit />
            </ActionIcon>
          </Group>
        </Tabs.List>
        <Tabs.Panel value="status">
          <StatusTab />
        </Tabs.Panel>
        <Tabs.Panel value="committer">
          <CommitterTab />
        </Tabs.Panel>
        <Tabs.Panel value="branches">
          <BranchesTab />
        </Tabs.Panel>
        <Tabs.Panel value="log">
          <LogTab />
        </Tabs.Panel>
        <Tabs.Panel value="files">
          <FilesTab />
        </Tabs.Panel>
      </Tabs>
    </main>
  );
}

export default App;
