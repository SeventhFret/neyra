import { Group, Stack, Text } from "@mantine/core";
import { IconBrandGitlab } from "@tabler/icons-react";

import GitProviderConfiguration from "../../components/GitProviderConfiguration/GitProviderConfiguration";

export default function GitLab() {
  return (
    <Stack gap="md">
      <Stack gap={2}>
        <Group gap="xs">
          <IconBrandGitlab size={19} stroke={1.7} />

          <Text fw={600} size="lg">
            GitLab provider configuration
          </Text>
        </Group>

        <Text c="dimmed" size="sm">
          Configure GitLab accounts and self-hosted instances.
        </Text>
      </Stack>

      <GitProviderConfiguration
        type="gitlab"
        name="GitLab"
        icon={IconBrandGitlab}
        defaultHost="https://gitlab.com"
        tokenPlaceholder="glpat-..."
      />
    </Stack>
  );
}
