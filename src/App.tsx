import { Tabs, Kbd, Group, ActionIcon } from "@mantine/core";
import { useClipboard, useHotkeys } from "@mantine/hooks";
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
  IconSettings,
  IconClipboard,
  IconClipboardCheck,
  IconFolder,
  IconDoorExit,
  IconGitMerge,
  IconMessageOff,
} from "@tabler/icons-react";
import { useRepoData } from "./stores";
import "./App.css";
import LogTab from "./tabs/log/LogTab";
import BranchesTab from "./tabs/branches/BranchesTab";
import FilesTab from "./tabs/files/FilesTab";
import ConfigTab from "./tabs/config/ConfigTab";
import PullRequestsTab from "./tabs/pull-requests/PullRequestsTab";
import { notifications } from "@mantine/notifications";

function App() {
  const [currentTab, setCurrentTab] = useState<string | null>("pull-requests");
  // The store already tracks the refresh it is running; a second flag next to
  // it only ever went true and false again inside the same handler.
  const refreshing = useRepoData((state) => state.isLoading);
  const refresh = useRepoData((state) => state.refresh);
  const currentBranch = useRepoData((state) => state.currentBranch);
  // Replaces CopyButton, whose copied state lives inside its render prop and so
  // could not be driven by the shortcut below.
  const clipboard = useClipboard({ timeout: 1500 });
  const copyBranch = () => clipboard.copy(currentBranch ?? "no branch");

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
      ["ctrl+K", () => setCurrentTab("config")],
      ["ctrl+P", () => setCurrentTab("pull-requests")],
      ["ctrl+R", () => void refresh()],
      ["ctrl+alt+C", copyBranch],
      ["ctrl+alt+L", () => notifications.clean()],
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
        {/* Every tab is out of the tab order — Mantine would otherwise leave
            the active one tabbable, so tabbing through a form still passed
            through the sidebar. The Ctrl shortcuts below each tab switch. */}
        <Tabs.List justify="center">
          <Tabs.Tab
            tabIndex={-1}
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
            tabIndex={-1}
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
            tabIndex={-1}
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
            tabIndex={-1}
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
          <Tabs.Tab
            tabIndex={-1}
            value="pull-requests"
            leftSection={<IconGitMerge />}
            rightSection={
              <div>
                <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">P</Kbd>
              </div>
            }
          >
            MR / PR
          </Tabs.Tab>
          <Tabs.Tab
            tabIndex={-1}
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
            tabIndex={-1}
            value="config"
            leftSection={<IconSettings />}
            rightSection={
              <div>
                <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">K</Kbd>
              </div>
            }
          >
            Config
          </Tabs.Tab>
          {/* Out of the tab order: these sit before every panel in the DOM, so
              tabbing into a form used to cross all three first. Each one has a
              shortcut instead. */}
          <Group mt="auto" px="xs" py="xs" justify="center">
            <ActionIcon
              tabIndex={-1}
              loading={refreshing}
              size="lg"
              onClick={() => void refresh()}
            >
              <IconRefresh />
            </ActionIcon>
            <ActionIcon
              tabIndex={-1}
              size="lg"
              color={clipboard.copied ? "teal" : "blue"}
              onClick={copyBranch}
            >
              {clipboard.copied ? <IconClipboardCheck /> : <IconClipboard />}
            </ActionIcon>
            <ActionIcon
              tabIndex={-1}
              size="lg"
              onClick={() => {
                notifications.clean();
              }}
            >
              <IconMessageOff />
            </ActionIcon>
            <ActionIcon
              tabIndex={-1}
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
        <Tabs.Panel value="files">
          <FilesTab />
        </Tabs.Panel>
        <Tabs.Panel value="pull-requests">
          <PullRequestsTab />
        </Tabs.Panel>
        <Tabs.Panel value="log">
          <LogTab />
        </Tabs.Panel>
        <Tabs.Panel value="config">
          <ConfigTab />
        </Tabs.Panel>
      </Tabs>
    </main>
  );
}

export default App;
