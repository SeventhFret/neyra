import { useClipboard, useHotkeys } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { exit } from "@tauri-apps/plugin-process";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { IconExclamationCircle, IconCircleCheck } from "@tabler/icons-react";
import { formatNotificationTime } from "./utils";

import CommitterTab from "./tabs/committer/CommitterTab";
import StatusTab from "./tabs/status/StatusTab";
import LogTab from "./tabs/log/LogTab";
import BranchesTab from "./tabs/branches/BranchesTab";
import FilesTab from "./tabs/files/FilesTab";
import SettingsTab from "./tabs/settings/SettingsTab";
import PullRequestsTab from "./tabs/pull-requests/PullRequestsTab";

import { NeyraDock } from "./components/NeyraDock/NeyraDock";
import { useRepoData } from "./stores";
import { useNotificationStore } from "./stores/notifications/store";
import "./App.css";
import {
  Drawer,
  Stack,
  Notification,
  Text,
  Group,
  Button,
} from "@mantine/core";
import { NotificationCenter } from "./components/NotificationCenter/NotificationCenter";

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
  const neyraNotifications = useNotificationStore((state) => state.items);
  const deleteNotification = useNotificationStore((state) => state.remove);
  const clearNotifications = useNotificationStore((state) => state.clear);

  const markRead = useNotificationStore((state) => state.markRead);

  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const unreadCount = useNotificationStore(
    (state) => state.items.filter((item) => !item.read).length,
  );
  const [notificationsOpened, { open, close }] = useDisclosure(false);
  const refreshing = useRepoData((state) => state.isLoading);
  const refresh = useRepoData((state) => state.refresh);
  const currentBranch = useRepoData((state) => state.currentBranch);

  const testNotification = {
    createdAt: 1789150161096,
    id: "14b94315-34d7-478d-8be2-5fda4c790348",
    message: "Finished fetching",
    read: false,
    title: "Fetch is successful",
    type: "success",
  };

  const clipboard = useClipboard({ timeout: 1500 });

  const copyBranch = () => {
    clipboard.copy(currentBranch ?? "no branch");
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  return (
    <main className="app">
      <div className="pageViewport">
        <Page tab="status" currentTab={currentTab}>
          <StatusTab />
        </Page>

        <Page tab="committer" currentTab={currentTab}>
          <CommitterTab />
        </Page>

        <Page tab="branches" currentTab={currentTab}>
          <BranchesTab />
        </Page>

        <Page tab="files" currentTab={currentTab}>
          <FilesTab />
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
