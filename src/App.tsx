import { useEffect, useState, useRef } from "react";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { useClipboard, useHotkeys } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { exit } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { IconCloudDownload } from "@tabler/icons-react";

import CommitterTab from "./tabs/committer/CommitterTab";
import StatusTab from "./tabs/status/StatusTab";
import LogTab from "./tabs/log/LogTab";
import BranchesTab from "./tabs/branches/BranchesTab";
import FilesTab from "./tabs/files/FilesTab";
import SettingsTab from "./tabs/settings/SettingsTab";
import MergeRequestsTab from "./tabs/merge-requests/MergeRequestsTab";
import GitFlowsTab from "./tabs/git-flows/GitFlowsTab";
import ChangesTab from "./tabs/changes/ChangesTab";

import { NeyraDock } from "./components/NeyraDock/NeyraDock";
import { NotificationCenter } from "./components/NotificationCenter/NotificationCenter";
import NeyraRepoSelector from "./components/NeyraRepoSelector/NeyraRepoSelector";
import NeyraStatusBar from "./components/NeyraStatusBar/NeyraStatusBar";
import NeyraUpdatesModal from "./components/NeyraUpdatesModal/NeyraUpdatesModal";
import {
  useRepoDataStore,
  listenForRepoChanges,
} from "./stores/repoData/store";
import { useNotificationStore } from "./stores/notifications/store";
import { useRepositorySelectionStore } from "./stores/repoSelector/store";
import { useGitProvidersStore } from "./stores/providers/store";
import { useUpdatesStore } from "./stores/updates/store";
import { showAppNotification } from "./components/NotificationCenter/helper";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import "./App.css";

export type TabId =
  | "status"
  | "committer"
  | "branches"
  | "files"
  | "merge-requests"
  | "log"
  | "git-flows"
  | "changes"
  | "settings";

const TAB_ORDER: TabId[] = [
  "status",
  "committer",
  "branches",
  "files",
  "merge-requests",
  "log",
  "git-flows",
  "changes",
  "settings",
];

function App() {
  // prevent default windows shortcuts from firing
  useKeyboardShortcuts();
  const [currentTab, setCurrentTab] = useState<TabId>("committer");
  const unreadCount = useNotificationStore(
    (state) => state.items.filter((item) => !item.read).length,
  );
  const [
    notificationsOpened,
    {
      open: openNotificationCenter,
      close: closeNotificationCenter,
      toggle: toggleNotificationCenter,
    },
  ] = useDisclosure(false);
  const [
    updateModalOpened,
    { open: openUpdateModal, close: closeUpdateModal },
  ] = useDisclosure(false);
  const setUpdate = useUpdatesStore((state) => state.setUpdate);
  const refreshing = useRepoDataStore((state) => state.isLoading);
  const refresh = useRepoDataStore((state) => state.refresh);
  const currentBranch = useRepoDataStore((state) => state.currentBranch);
  const repoStatus = useRepositorySelectionStore((state) => state.status);
  const repoRoot = useRepositorySelectionStore((state) => state.root);
  const initializeRepo = useRepositorySelectionStore(
    (state) => state.initialize,
  );
  const setRepoSelectionStatus = useRepositorySelectionStore(
    (state) => state.setRepoSelectionStatus,
  );
  const initializeGitProviders = useGitProvidersStore(
    (state) => state.initialize,
  );

  const clipboard = useClipboard({ timeout: 1500 });

  const copyBranch = () => {
    clipboard.copy(currentBranch ?? "no branch");
  };

  const onSwitchRepo = () => {
    setRepoSelectionStatus("none");
  };

  useEffect(() => {
    if (repoStatus !== "ready") {
      return;
    }

    void refresh();

    let unlisten: (() => void) | undefined;
    let disposed = false;

    void listenForRepoChanges().then((stop) => {
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
  }, [repoStatus, refresh]);

  useEffect(() => {
    initializeRepo();
    initializeGitProviders();
  }, []);

  const selectTab = (nextTab: TabId) => {
    if (nextTab === currentTab) {
      return;
    }

    setCurrentTab(nextTab);
  };

  useEffect(() => {
    check().then((update) => {
      if (update === null) {
        return;
      }

      setUpdate(update);
      showAppNotification({
        type: "update",
        title: "Update available",
        message: `Neyra v${update.version} is released!`,
        actions: [
          {
            icon: IconCloudDownload,
            label: "Update now",
            onClick: () => {
              openUpdateModal();
            },
          },
        ],
      });
    });
  }, []);

  useHotkeys(
    [
      ["mod+T", () => selectTab("status"), { usePhysicalKeys: true }],
      ["mod+G", () => selectTab("committer"), { usePhysicalKeys: true }],
      ["mod+B", () => selectTab("branches"), { usePhysicalKeys: true }],
      ["mod+E", () => selectTab("log"), { usePhysicalKeys: true }],
      ["mod+D", () => selectTab("files"), { usePhysicalKeys: true }],
      ["mod+K", () => selectTab("settings"), { usePhysicalKeys: true }],
      ["mod+P", () => selectTab("merge-requests"), { usePhysicalKeys: true }],
      ["mod+J", () => selectTab("changes"), { usePhysicalKeys: true }],
      ["mod+I", () => selectTab("git-flows"), { usePhysicalKeys: true }],
      [
        "mod+shift+N",
        () => toggleNotificationCenter(),
        { usePhysicalKeys: true },
      ],

      ["mod+R", () => void refresh(), { usePhysicalKeys: true }],
      ["mod+alt+C", () => copyBranch(), { usePhysicalKeys: true }],
      ["mod+alt+L", () => notifications.clean(), { usePhysicalKeys: true }],
      ["mod+O", () => onSwitchRepo(), { usePhysicalKeys: true }],
      ["mod+Q", () => void exit(0)],
    ],
    [],
  );

  if (repoStatus === "none") {
    return <NeyraRepoSelector withExit={repoRoot !== null} />;
  }

  if (repoStatus === "checking") {
    return (
      <Center w="100dvw" h="100dvh">
        <Stack align="center">
          <Loader color="var(--neyra-primary)" />
          <Text c="dimmed">Loading the repository...</Text>
        </Stack>
      </Center>
    );
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

        <Page tab="merge-requests" currentTab={currentTab}>
          <MergeRequestsTab />
        </Page>

        <Page tab="log" currentTab={currentTab}>
          <LogTab />
        </Page>

        <Page tab="git-flows" currentTab={currentTab}>
          <GitFlowsTab />
        </Page>

        <Page tab="changes" currentTab={currentTab}>
          <ChangesTab />
        </Page>

        <Page tab="settings" currentTab={currentTab}>
          <SettingsTab />
        </Page>
      </div>

      <NotificationCenter
        opened={notificationsOpened}
        onClose={closeNotificationCenter}
      />
      <NeyraDock
        value={currentTab}
        onChange={selectTab}
        refreshing={refreshing}
        copied={clipboard.copied}
        onRefresh={() => refresh()}
        onCopyBranch={copyBranch}
        onOpenNotifications={() => openNotificationCenter()}
        onSwitchRepo={() => onSwitchRepo()}
        onExit={() => exit(0)}
        unreadNotifications={unreadCount}
      />
      <NeyraUpdatesModal
        opened={updateModalOpened}
        onClose={closeUpdateModal}
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
  const pageRef = useRef<HTMLElement>(null);

  const pageIndex = TAB_ORDER.indexOf(tab);
  const activeIndex = TAB_ORDER.indexOf(currentTab);

  const offset = pageIndex < activeIndex ? -8 : 8;

  useEffect(() => {
    if (!active) {
      return;
    }

    pageRef.current?.focus({
      preventScroll: true,
    });
  }, [active]);

  return (
    <motion.section
      ref={pageRef}
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
      tabIndex={-1}
      aria-hidden={!active}
      inert={!active}
    >
      {children}
    </motion.section>
  );
}
export default App;
