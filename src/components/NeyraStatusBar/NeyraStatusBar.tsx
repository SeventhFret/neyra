import { Group, Text } from "@mantine/core";

import { useRepoData } from "../../stores";
import { repoName } from "../NeyraRepoSelector/NeyraRepoSelector";
import { IconGitBranch } from "@tabler/icons-react";
import neyraLogo from "../../assets/logo/neyra-logo-1024.png";
import classes from "./NeyraStatusBar.module.css";

export default function NeyraStatusBar() {
  const currentBranch = useRepoData((state) => state.currentBranch);
  const repoRoot = useRepoData((state) => state.root);

  return (
    <div className={classes.statusBar}>
      <img src={neyraLogo} className={classes.neyraLogo} alt="Neyra" />

      <Group className={classes.repository} gap="xs" wrap="nowrap">
        {repoName(repoRoot) !== repoRoot ? (
          <Text fw={600} size="sm" truncate>
            {repoName(repoRoot)}
          </Text>
        ) : null}

        <Text size="xs" c="dimmed" truncate>
          {repoRoot}
        </Text>
      </Group>

      <Group className={classes.branch} gap={5} wrap="nowrap">
        <IconGitBranch size={14} stroke={1.7} />

        <Text size="xs" fw={500} truncate>
          {currentBranch ?? "detached HEAD"}
        </Text>
      </Group>
    </div>
  );
}
