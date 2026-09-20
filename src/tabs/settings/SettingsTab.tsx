import { Stack, Tabs } from "@mantine/core";
import {
  IconBrandGit,
  IconBrandGithub,
  IconBrandGitlab,
  IconPalette,
  IconTicket,
} from "@tabler/icons-react";

import GitConfig from "./tabs/GitConfig/GitConfig";
import classes from "./SettingsTab.module.css";
import GitHub from "./tabs/GitHub/GitHub";
import GitLab from "./tabs/GitLab/GitLab";

export default function SettingsTab() {
  return (
    <Stack px="lg" className={classes.page}>
      <div className="header-container">
        <h1>Settings</h1>
      </div>

      <Tabs
        defaultValue="git-config"
        orientation="vertical"
        variant="pills"
        classNames={{
          root: classes.tabs,
          list: classes.list,
          tab: classes.tab,
          panel: classes.panel,
        }}
      >
        <Tabs.List>
          <Tabs.Tab
            value="git-config"
            leftSection={<IconBrandGit size={19} stroke={1.7} />}
          >
            Git Config
          </Tabs.Tab>

          <Tabs.Tab
            value="gitlab"
            leftSection={<IconBrandGitlab size={19} stroke={1.7} />}
          >
            GitLab
          </Tabs.Tab>

          <Tabs.Tab
            value="github"
            leftSection={<IconBrandGithub size={19} stroke={1.7} />}
          >
            GitHub
          </Tabs.Tab>

          <Tabs.Tab
            value="jira"
            leftSection={<IconTicket size={19} stroke={1.7} />}
            disabled
          >
            Jira
          </Tabs.Tab>

          <Tabs.Tab
            value="appearance"
            leftSection={<IconPalette size={19} stroke={1.7} />}
            disabled
          >
            Appearance
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="git-config">
          <GitConfig />
        </Tabs.Panel>
        <Tabs.Panel value="github">
          <GitHub />
        </Tabs.Panel>
        <Tabs.Panel value="gitlab">
          <GitLab />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
