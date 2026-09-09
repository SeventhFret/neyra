import {
  Accordion,
  Badge,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  RenderTreeNodePayload,
  Tree,
  TreeNodeData,
  ScrollArea,
  Button,
  useTree,
  ActionIcon,
  Box,
  Avatar,
} from "@mantine/core";
import { usePullRequestsData } from "../../stores";
import {
  IconBrandGitlab,
  IconBrandGithub,
  IconChevronDown,
  IconChevronRight,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconNumber,
  IconLink,
  IconGitBranch,
  IconArrowRight,
  IconCheck,
  IconX,
  IconClockCheck,
} from "@tabler/icons-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useMemo } from "react";

type PrNode = Record<string, unknown>;

type TreeNode =
  | { type: "group"; name: string; children: TreeNode[] }
  | { type: "pr"; pr: PrNode };

type PrTreeNode = TreeNodeData & {
  pr?: PrNode;
  children?: PrTreeNode[];
};

const getClearPath = (prData: Record<string, any>) => {
  return prData?.references?.full?.replace(prData?.reference, "");
};

function groupPrsByPath(prs: PrNode[]): PrTreeNode[] {
  const root: PrTreeNode[] = [];

  for (const pr of prs) {
    const parts = getClearPath(pr).split("/").filter(Boolean);

    let currentLevel = root;
    let currentPath = "";

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let group = currentLevel.find((node) => node.value === currentPath);

      if (!group) {
        group = {
          value: currentPath,
          label: part,
          children: [],
        };

        currentLevel.push(group);
      }

      currentLevel = group.children!;
    }

    currentLevel.push({
      // Replace with whatever unique identifier your PR has
      value: `${currentPath}/pr-${crypto.randomUUID()}`,
      label: "PR",
      pr,
    });
  }

  return root;
}

type PrTreeProps = {
  prs: PrNode[];
};

export function PrTree({ prs }: PrTreeProps) {
  const tree = useTree();
  const data = useMemo(() => groupPrsByPath(prs), [prs]);

  return (
    <Stack>
      <Group>
        <ActionIcon color="transparent" onClick={() => tree.expandAllNodes()}>
          <IconArrowsMaximize size={18} />
        </ActionIcon>
        <ActionIcon color="transparent" onClick={() => tree.collapseAllNodes()}>
          <IconArrowsMinimize size={18} />
        </ActionIcon>
      </Group>
      <ScrollArea w="300px" h="100%" type="auto" scrollbars="xy" pb="sm">
        <Tree
          levelOffset="lg"
          data={data}
          tree={tree}
          withLines
          style={{ minWidth: "max-content" }}
          renderNode={(payload) => <TreeNode {...payload} />}
        />
      </ScrollArea>
    </Stack>
  );
}

function TreeNode({
  node,
  expanded,
  hasChildren,
  elementProps,
}: RenderTreeNodePayload) {
  const appNode = node as PrTreeNode;
  const setSelectedGlPr = usePullRequestsData((state) => state.selectGlPr);

  if (appNode.pr) {
    return (
      <Button
        px="sm"
        justify="flex-start"
        onClick={() => setSelectedGlPr(appNode?.pr)}
        py="6"
        fullWidth
        color="transparent"
      >
        <Text
          {...elementProps}
          size="xs"
          onClick={() => setSelectedGlPr(appNode?.pr)}
        >
          {appNode.pr.title}
        </Text>
      </Button>
    );
  }

  return (
    <Group gap="xs" py="6" {...elementProps}>
      {expanded && hasChildren ? (
        <IconChevronDown size={16} />
      ) : (
        <IconChevronRight size={16} />
      )}
      <Text fw="600">{node.label}</Text>
    </Group>
  );
}

export default function PullRequestsTab() {
  const glPullRequests = usePullRequestsData((state) => state.glPullRequests);
  const getGlPullRequests = usePullRequestsData(
    (state) => state.getGlPullRequests,
  );
  const glSelectedPr = usePullRequestsData((state) => state.glSelectedPr);

  console.log(glPullRequests);
  useEffect(() => {
    getGlPullRequests();
  }, []);

  return (
    <div
      style={{
        marginLeft: "15px",
        marginRight: "15px",
        paddingBottom: "15px",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <Group align="center" wrap="nowrap">
        <div className="header-container">
          <h1>Merge/Pull requests</h1>
        </div>
      </Group>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: "grow",
          gap: "10px",
        }}
      >
        <Accordion
          variant="separate"
          multiple={true}
          order={2}
          defaultValue={["gitlab"]}
          radius="lg"
          chevronIconSize={24}
        >
          <Accordion.Item key="gitlab" value="gitlab">
            <Accordion.Control
              icon={<IconBrandGitlab size={32} color="#fc6d26" />}
            >
              <Title order={2}>GitLab</Title>
            </Accordion.Control>
            <Accordion.Panel h="100%">
              <Group gap="xs" w="100%" h="100%" wrap="nowrap">
                <Box w={320} style={{ flexShrink: 0 }}>
                  <PrTree prs={glPullRequests} />
                </Box>
                <Paper
                  p="md"
                  h="100%"
                  w="100%"
                  bg="#252525"
                  flex={1}
                  radius="lg"
                >
                  {typeof glSelectedPr === "object" &&
                  Object.keys(glSelectedPr).length > 0 ? (
                    <Stack>
                      <Group w="100%">
                        <Group flex={1}>
                          <Text size="sm" c="dimmed">
                            {getClearPath(glSelectedPr)
                              .split("/")
                              .join("  /  ")}
                          </Text>
                          <Badge
                            variant="light"
                            radius="sm"
                            leftSection={<IconNumber size={14} />}
                          >
                            {glSelectedPr.reference}
                          </Badge>
                          {glSelectedPr.draft ? (
                            <Badge color="red" radius="md" variant="light">
                              Draft
                            </Badge>
                          ) : null}
                        </Group>
                        <ActionIcon
                          color="transparent"
                          onClick={() => {
                            openUrl(glSelectedPr?.web_url);
                          }}
                        >
                          <IconLink size={16} />
                        </ActionIcon>
                      </Group>
                      <Text fw={600}>{glSelectedPr.title}</Text>
                      <Text fw={400} c="dimmed">
                        {glSelectedPr?.description?.length > 0
                          ? glSelectedPr?.description
                          : "No description provided"}
                      </Text>
                      <Group>
                        {/* Assignee */}
                        <Stack gap="xs">
                          <Text c="dimmed" size="xs">
                            Assignee
                          </Text>
                          <Group gap="xs">
                            <Avatar
                              size="sm"
                              name={
                                glSelectedPr?.assignee?.name ?? "Not assigned"
                              }
                            ></Avatar>
                            <Text size="sm">
                              {glSelectedPr?.assignee?.name ?? "Not assigned"}
                            </Text>
                          </Group>
                        </Stack>

                        {/* Reviewer */}
                        <Stack gap="xs">
                          <Text c="dimmed" size="xs">
                            Reviewer
                          </Text>
                          <Group gap="xs">
                            <Avatar
                              size="sm"
                              name={
                                glSelectedPr?.reviewers.at(0)?.name ??
                                "Not assigned"
                              }
                            ></Avatar>
                            <Text size="sm">
                              {glSelectedPr?.reviewers.at(0)?.name ??
                                "Not assigned"}
                            </Text>
                          </Group>
                        </Stack>
                      </Group>
                      <Group>
                        <Badge
                          variant="light"
                          radius="md"
                          fw={400}
                          size="lg"
                          leftSection={<IconGitBranch stroke={1.5} size={16} />}
                        >
                          {glSelectedPr["source_branch"]}
                        </Badge>
                        <IconArrowRight size={18} />
                        <Badge
                          variant="light"
                          size="lg"
                          radius="md"
                          fw={400}
                          leftSection={<IconGitBranch stroke={1.5} size={16} />}
                        >
                          {glSelectedPr["target_branch"]}
                        </Badge>
                      </Group>
                      <Group>
                        {glSelectedPr.merge_status === "can_be_merged" ? (
                          <Group gap="xs">
                            <IconCheck size={22} color="green" />
                            <Text size="sm">Can be merged</Text>
                          </Group>
                        ) : glSelectedPr.merge_status === "cannot_be_merged" ? (
                          <Group gap="xs">
                            <IconX color="red" size={22} />
                            <Text size="sm">Can not be merged</Text>
                          </Group>
                        ) : null}
                        {glSelectedPr.merge_when_pipeline_succeeds ? (
                          <Group gap="xs">
                            <IconClockCheck color="#228be6" size={22} />
                            <Text size="sm">Set to automerge</Text>
                          </Group>
                        ) : null}
                        {glSelectedPr.detailed_merge_status !==
                        "need_rebase" ? (
                          <Group gap="xs">
                            <IconGitBranch color="#e03131" size={22} />
                            <Text size="sm">
                              Needs rebasing{" "}
                              {glSelectedPr.has_conflicts
                                ? "(Conflicts!)"
                                : null}
                            </Text>
                          </Group>
                        ) : null}
                      </Group>
                    </Stack>
                  ) : (
                    <Text c="dimmed">No merge or pull request selected</Text>
                  )}
                  <Text></Text>
                </Paper>
              </Group>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item key="github" value="github">
            <Accordion.Control
              icon={<IconBrandGithub size={32} color="#8534F3" />}
            >
              <Title order={2}>GitHub</Title>
            </Accordion.Control>
            <Accordion.Panel>
              <Text c="dimmed" fs="italic">
                To be done...
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
}
