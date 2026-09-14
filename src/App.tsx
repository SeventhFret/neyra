import { useClipboard, useHotkeys } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { exit } from "@tauri-apps/plugin-process";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import CommitterTab from "./tabs/committer/CommitterTab";
import StatusTab from "./tabs/status/StatusTab";
import LogTab from "./tabs/log/LogTab";
import BranchesTab from "./tabs/branches/BranchesTab";
import FilesTab from "./tabs/files/FilesTab";
import SettingsTab from "./tabs/settings/SettingsTab";
import PullRequestsTab from "./tabs/pull-requests/PullRequestsTab";

import { NeyraDock } from "./components/NeyraDock/NeyraDock";
import { useRepoData, listenForRepoChanges } from "./stores";
import { useNotificationStore } from "./stores/notifications/store";
import { useRepositorySelectionStore } from "./stores/repoSelector/store";
import "./App.css";
import { NotificationCenter } from "./components/NotificationCenter/NotificationCenter";
import NeyraRepoSelector from "./components/NeyraRepoSelector/NeyraRepoSelector";
import NeyraStatusBar from "./components/NeyraStatusBar/NeyraStatusBar";
import { IconCloudDownload } from "@tabler/icons-react";
import { showAppNotification } from "./components/NotificationCenter/helper";

export type TabId =
  | "status"
  | "committer"
  | "branches"
  | "files"
  | "pull-requests"
  | "log"
  | "settings";

const TAB_ORDER: TabId[] = [
  "status",
  "committer",
  "branches",
  "files",
  "pull-requests",
  "log",
  "settings",
];

function App() {
  const [currentTab, setCurrentTab] = useState<TabId>("committer");
  const unreadCount = useNotificationStore(
    (state) => state.items.filter((item) => !item.read).length,
  );
  const [notificationsOpened, { open, close }] = useDisclosure(false);
  const refreshing = useRepoData((state) => state.isLoading);
  const refresh = useRepoData((state) => state.refresh);
  const currentBranch = useRepoData((state) => state.currentBranch);
  const repoStatus = useRepositorySelectionStore((state) => state.status);
  const initializeRepo = useRepositorySelectionStore(
    (state) => state.initialize,
  );

  const clipboard = useClipboard({ timeout: 1500 });

  const copyBranch = () => {
    clipboard.copy(currentBranch ?? "no branch");
  };

  useEffect(() => {
    showAppNotification({
      title: "Update available",
      message: "New version of Neyra is available",
      type: "update",
      actions: [
        {
          label: "Update now",
          icon: IconCloudDownload,
          onClick: () => console.log("Update now clicked"),
        },
      ],
    });
    showAppNotification({
      title: "Information",
      message: "Cool stuff happens bro",
      type: "info",
    });
    showAppNotification({
      title: "Push is successful",
      message: "Some git output",
      type: "success",
      messageFormat: "code",
    });
    showAppNotification({
      title: "Warning",
      message: "Something is not cool, but you can ignore it",
      type: "warning",
    });
    showAppNotification({
      title: "Error",
      message: "Something is bad but pls don't ignore it",
      type: "error",
    });
  }, []);

  useEffect(() => {
    refresh();

    let unlisten: (() => void) | undefined;
    let disposed = false;

    listenForRepoChanges().then((stop) => {
      if (disposed) {
        stop();
      } else {
        unlisten = stop;
      }
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [refresh]);

  useEffect(() => {
    initializeRepo();
  }, [initializeRepo]);

  const selectTab = (nextTab: TabId) => {
    if (nextTab === currentTab) {
      return;
    }

    setCurrentTab(nextTab);
  };

  useHotkeys(
    [
      ["mod+T", () => selectTab("status"), { usePhysicalKeys: true }],
      ["mod+G", () => selectTab("committer"), { usePhysicalKeys: true }],
      ["mod+B", () => selectTab("branches"), { usePhysicalKeys: true }],
      ["mod+E", () => selectTab("log"), { usePhysicalKeys: true }],
      ["mod+D", () => selectTab("files"), { usePhysicalKeys: true }],
      ["mod+K", () => selectTab("settings"), { usePhysicalKeys: true }],
      ["mod+P", () => selectTab("pull-requests"), { usePhysicalKeys: true }],

      ["mod+R", () => void refresh(), { usePhysicalKeys: true }],
      ["mod+alt+C", () => copyBranch(), { usePhysicalKeys: true }],
      ["mod+alt+L", () => notifications.clean(), { usePhysicalKeys: true }],
      ["mod+Q", () => void exit(0)],
    ],
    [],
  );

  if (repoStatus === "none") {
    return <NeyraRepoSelector />;
  }

  return (
    <main className="app">
      <NeyraStatusBar />
      <div className="pageViewport">
        <Page tab="status" currentTab={currentTab}>
          <StatusTab active={currentTab === "status"} />
        </Page>

        <Page tab="committer" currentTab={currentTab}>
          <CommitterTab active={currentTab === "committer"} />
        </Page>

        <Page tab="branches" currentTab={currentTab}>
          <BranchesTab active={currentTab === "branches"} />
        </Page>

        <Page tab="files" currentTab={currentTab}>
          <FilesTab active={currentTab === "files"} />
        </Page>

        <Page tab="pull-requests" currentTab={currentTab}>
          <PullRequestsTab />
        </Page>

        <Page tab="log" currentTab={currentTab}>
          <LogTab />
        </Page>

        <Page tab="settings" currentTab={currentTab}>
          <SettingsTab />
        </Page>
      </div>

      <NotificationCenter opened={notificationsOpened} onClose={close} />
      <NeyraDock
        value={currentTab}
        onChange={selectTab}
        refreshing={refreshing}
        copied={clipboard.copied}
        onRefresh={() => void refresh()}
        onCopyBranch={copyBranch}
        onOpenNotifications={() => open()}
        onExit={() => void exit(0)}
        unreadNotifications={unreadCount}
      />
    </main>
  );
}

interface PageProps {
  tab: TabId;
  currentTab: TabId;
  children: ReactNode;
}

function Page({ tab, currentTab, children }: PageProps) {
  const active = tab === currentTab;

  const pageIndex = TAB_ORDER.indexOf(tab);
  const activeIndex = TAB_ORDER.indexOf(currentTab);

  const offset = pageIndex < activeIndex ? -8 : 8;

  return (
    <motion.section
      className="page"
      data-active={active || undefined}
      initial={false}
      animate={{
        opacity: active ? 1 : 0,
        x: active ? 0 : offset,
      }}
      transition={{
        duration: 0.14,
        ease: "easeOut",
      }}
      style={{
        pointerEvents: active ? "auto" : "none",
      }}
      aria-hidden={!active}
    >
      {children}
    </motion.section>
  );
}

export default App;
