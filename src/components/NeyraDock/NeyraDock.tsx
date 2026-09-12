import { motion } from "motion/react";
import {
  ActionIcon,
  Divider,
  Group,
  Indicator,
  Text,
  Tooltip,
} from "@mantine/core";

import {
  IconBell,
  IconClipboard,
  IconClipboardCheck,
  IconDoorExit,
  IconFolder,
  IconGitBranch,
  IconGitCommit,
  IconGitMerge,
  IconListDetails,
  IconRefresh,
  IconSettings,
  IconTerminal2,
} from "@tabler/icons-react";

import type { Shortcut } from "../ShortcutKeys/ShortcutKeys.types";
import ShortcutKeys from "../ShortcutKeys/ShortcutKeys";
import type { TabId } from "../../App";
import classes from "./NeyraDock.module.css";

interface NeyraDockProps {
  value: TabId;
  onChange: (tab: TabId) => void;

  refreshing: boolean;
  copied: boolean;

  onRefresh: () => void;
  onCopyBranch: () => void;
  onOpenNotifications: () => void;
  onExit: () => void;

  unreadNotifications?: number;
}

const tabs: {
  id: TabId;
  label: string;
  shortcut: Shortcut;
  icon: typeof IconGitCommit;
}[] = [
  {
    id: "status",
    label: "Status",
    shortcut: { modifiers: ["mod"], key: "T" },
    icon: IconTerminal2,
  },
  {
    id: "committer",
    label: "Commit",
    shortcut: { modifiers: ["mod"], key: "G" },
    icon: IconGitCommit,
  },
  {
    id: "branches",
    label: "Branches",
    shortcut: { modifiers: ["mod"], key: "B" },
    icon: IconGitBranch,
  },
  {
    id: "files",
    label: "Files",
    shortcut: { modifiers: ["mod"], key: "D" },
    icon: IconFolder,
  },
  {
    id: "pull-requests",
    label: "Pull / Merge requests",
    shortcut: { modifiers: ["mod"], key: "P" },
    icon: IconGitMerge,
  },
  {
    id: "log",
    label: "Log",
    shortcut: { modifiers: ["mod"], key: "E" },
    icon: IconListDetails,
  },
  {
    id: "settings",
    label: "Settings",
    shortcut: { modifiers: ["mod"], key: "K" },
    icon: IconSettings,
  },
];

function DockTooltip({
  label,
  shortcut,
}: {
  label: string;
  shortcut?: Shortcut;
}) {
  return (
    <Group gap="sm" wrap="nowrap">
      <Text size="sm">{label}</Text>

      {shortcut && <ShortcutKeys shortcut={shortcut} />}
    </Group>
  );
}

export function NeyraDock({
  value,
  onChange,
  refreshing,
  copied,
  onRefresh,
  onCopyBranch,
  onOpenNotifications,
  onExit,
  unreadNotifications = 0,
}: NeyraDockProps) {
  return (
    <div className={classes.shell}>
      <div className={classes.shellLeft} />

      <nav className={classes.dock} aria-label="Main navigation">
        <Group gap={6} wrap="nowrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = value === tab.id;

            return (
              <Tooltip
                key={tab.id}
                label={
                  <DockTooltip label={tab.label} shortcut={tab.shortcut} />
                }
                position="top"
                openDelay={300}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className={classes.dockTab}
                  data-active={active || undefined}
                  onClick={() => onChange(tab.id)}
                  aria-label={tab.label}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <motion.div
                      layoutId="active-dock-tab"
                      className={classes.activeTab}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 38,
                      }}
                    />
                  )}

                  <motion.div
                    className={classes.dockIcon}
                    animate={{
                      opacity: active ? 1 : 0.72,
                      y: active ? -1 : 0,
                    }}
                    transition={{
                      duration: 0.14,
                      ease: "easeOut",
                    }}
                  >
                    <Icon size={26} stroke={1.7} />
                  </motion.div>
                </button>
              </Tooltip>
            );
          })}
        </Group>

        <Divider orientation="vertical" className={classes.dockDivider} />

        <Group gap={4} wrap="nowrap">
          <Tooltip
            label={
              <DockTooltip
                label="Refresh Git data"
                shortcut={{ modifiers: ["mod"], key: "R" }}
              />
            }
            position="top"
          >
            <ActionIcon
              tabIndex={-1}
              variant="subtle"
              size={40}
              radius="md"
              loading={refreshing}
              onClick={onRefresh}
              aria-label="Refresh Git data"
              className={classes.quickAction}
            >
              <IconRefresh size={21} stroke={1.7} />
            </ActionIcon>
          </Tooltip>

          <Tooltip
            label={
              <DockTooltip
                label="Copy branch name"
                shortcut={{
                  modifiers: ["mod", "alt"],
                  key: "C",
                }}
              />
            }
            position="top"
          >
            <ActionIcon
              tabIndex={-1}
              variant="subtle"
              size={40}
              radius="md"
              onClick={onCopyBranch}
              aria-label="Copy branch name"
              className={classes.quickAction}
              data-copied={copied || undefined}
            >
              {copied ? (
                <IconClipboardCheck size={21} stroke={1.7} />
              ) : (
                <IconClipboard size={21} stroke={1.7} />
              )}
            </ActionIcon>
          </Tooltip>

          <Tooltip
            label={
              <DockTooltip
                label="Exit Neyra"
                shortcut={{ modifiers: ["mod"], key: "Q" }}
              />
            }
            position="top"
          >
            <ActionIcon
              tabIndex={-1}
              variant="subtle"
              size={40}
              radius="md"
              onClick={onExit}
              aria-label="Exit Neyra"
              className={`${classes.quickAction} ${classes.exitAction}`}
            >
              <IconDoorExit size={21} stroke={1.7} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </nav>

      <div className={classes.shellRight}>
        <Tooltip label="Notifications" position="left">
          <Indicator
            disabled={unreadNotifications === 0}
            label={unreadNotifications}
            size={16}
            offset={4}
            color="neyraBlue"
          >
            <button
              type="button"
              className={`${classes.dockTab} ${classes.notificationButton}`}
              onClick={onOpenNotifications}
              aria-label="Open notifications"
            >
              <div className={classes.dockIcon}>
                <IconBell size={26} stroke={1.7} />
              </div>
            </button>
          </Indicator>
        </Tooltip>
      </div>
    </div>
  );
}
