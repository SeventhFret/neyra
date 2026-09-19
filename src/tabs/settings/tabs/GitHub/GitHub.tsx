import { Group, Stack, Text } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";

import GitProviderConfiguration from "../../components/GitProviderConfiguration/GitProviderConfiguration";

export default function GitHub() {
  return (
    <Stack gap="md">
      <Stack gap={2}>
        <Group gap="xs">
          <IconBrandGithub size={19} stroke={1.7} />

          <Text fw={600} size="lg">
            GitHub provider configuration
          </Text>
        </Group>

        <Text c="dimmed" size="sm">
          Configure GitLab accounts and self-hosted instances.
        </Text>
      </Stack>

      <GitProviderConfiguration
        type="github"
        name="GitHub"
        icon={IconBrandGithub}
        defaultHost="https://github.com"
        tokenPlaceholder="github_pat_..."
      />
    </Stack>
  );
}
