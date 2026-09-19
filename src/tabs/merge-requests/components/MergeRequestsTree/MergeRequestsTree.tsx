import {
  ActionIcon,
  Group,
  type RenderTreeNodePayload,
  ScrollArea,
  Stack,
  Text,
  Tree,
  type TreeNodeData,
  UnstyledButton,
  useTree,
} from "@mantine/core";
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconBrandGithub,
  IconBrandGitlab,
  IconChevronDown,
  IconChevronRight,
  IconGitPullRequest,
} from "@tabler/icons-react";
import { useMemo } from "react";

import type { ProviderMergeRequest } from "../../../../stores/mergeRequests/store.types";

import classes from "./MergeRequestsTree.module.css";

type MergeRequestsTreeProps = {
  requests: ProviderMergeRequest[];
  selected: ProviderMergeRequest | null;
  onSelect: (request: ProviderMergeRequest) => void;
};

type MergeRequestTreeNode = {
  value: string;
  label: string;

  nodeType: "provider-type" | "provider" | "repository-part" | "request";

  providerType?: "github" | "gitlab";
  request?: ProviderMergeRequest;

  children?: MergeRequestTreeNode[];
};

export default function MergeRequestsTree({
  requests,
  selected,
  onSelect,
}: MergeRequestsTreeProps) {
  const tree = useTree();

  const data = useMemo(() => buildTree(requests), [requests]);

  if (requests.length === 0) {
    return (
      <Stack
        align="center"
        justify="center"
        flex={1}
        gap={4}
        className={classes.empty}
      >
        <IconGitPullRequest size={28} stroke={1.4} />

        <Text size="sm" fw={500}>
          No requests found
        </Text>

        <Text size="xs" c="dimmed">
          Try changing your search.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xs" flex={1} style={{ minHeight: 0 }}>
      <Group gap={4} justify="flex-end">
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label="Expand all"
          onClick={() => tree.expandAllNodes()}
        >
          <IconArrowsMaximize size={15} />
        </ActionIcon>

        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label="Collapse all"
          onClick={() => tree.collapseAllNodes()}
        >
          <IconArrowsMinimize size={15} />
        </ActionIcon>
      </Group>

      <ScrollArea
        flex={1}
        type="auto"
        scrollbars="xy"
        className={classes.scroll}
      >
        <Tree
          tree={tree}
          data={data as TreeNodeData[]}
          levelOffset={20}
          withLines
          className={classes.tree}
          renderNode={(payload) => (
            <MergeRequestNode
              payload={payload}
              selectedRequest={selected}
              onSelect={onSelect}
            />
          )}
        />
      </ScrollArea>
    </Stack>
  );
}

type MergeRequestNodeProps = {
  payload: RenderTreeNodePayload;
  selectedRequest: ProviderMergeRequest | null;
  onSelect: (request: ProviderMergeRequest) => void;
};

function MergeRequestNode({
  payload,
  selectedRequest,
  onSelect,
}: MergeRequestNodeProps) {
  const { node, expanded, hasChildren, elementProps, level } = payload;
  const indent = (level - 1) * 20;

  const appNode = node as MergeRequestTreeNode;

  if (appNode.nodeType === "request" && appNode.request) {
    const request = appNode.request;

    const active =
      selectedRequest?.providerId === request.providerId &&
      selectedRequest?.id === request.id;

    return (
      <UnstyledButton
        {...elementProps}
        className={classes.request}
        data-active={active || undefined}
        style={{
          ...elementProps.style,
          paddingLeft: indent + 7,
        }}
        onClick={() => onSelect(request)}
      >
        <IconGitPullRequest
          size={14}
          stroke={1.7}
          className={classes.requestIcon}
        />

        <Text
          size="xs"
          fw={active ? 600 : 500}
          truncate
          className={classes.requestTitle}
        >
          {request.title}
        </Text>

        <Text size="xs" c="dimmed" className={classes.number}>
          #{request.number}
        </Text>
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton
      {...elementProps}
      className={classes.group}
      style={{
        ...elementProps.style,
        paddingLeft: indent + 5,
      }}
    >
      <Group gap={6} wrap="nowrap">
        <span className={classes.chevron}>
          {hasChildren ? (
            expanded ? (
              <IconChevronDown size={14} />
            ) : (
              <IconChevronRight size={14} />
            )
          ) : null}
        </span>

        {appNode.nodeType === "provider-type" &&
          appNode.providerType === "gitlab" && (
            <IconBrandGitlab
              size={16}
              stroke={1.7}
              className={classes.providerIcon}
            />
          )}

        {appNode.nodeType === "provider-type" &&
          appNode.providerType === "github" && (
            <IconBrandGithub
              size={16}
              stroke={1.7}
              className={classes.providerIcon}
            />
          )}

        <Text
          size="sm"
          fw={appNode.nodeType === "provider-type" ? 600 : 500}
          truncate
        >
          {appNode.label}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

function buildTree(requests: ProviderMergeRequest[]): MergeRequestTreeNode[] {
  const root: MergeRequestTreeNode[] = [];

  for (const request of requests) {
    const providerTypeValue = `provider-type:${request.providerType}`;

    let providerTypeNode = root.find(
      (node) => node.value === providerTypeValue,
    );

    if (!providerTypeNode) {
      providerTypeNode = {
        value: providerTypeValue,
        label: request.providerType === "gitlab" ? "GitLab" : "GitHub",
        nodeType: "provider-type",
        providerType: request.providerType,
        children: [],
      };

      root.push(providerTypeNode);
    }

    const providerValue = `${providerTypeValue}:provider:${request.providerId}`;

    let providerNode = providerTypeNode.children?.find(
      (node) => node.value === providerValue,
    );

    if (!providerNode) {
      providerNode = {
        value: providerValue,
        label: request.providerId,
        nodeType: "provider",
        children: [],
      };

      providerTypeNode.children ??= [];
      providerTypeNode.children.push(providerNode);
    }

    addRepositoryPath(providerNode, request);
  }

  sortTree(root);

  return root;
}

function addRepositoryPath(
  providerNode: MergeRequestTreeNode,
  request: ProviderMergeRequest,
) {
  const parts = request.repository.split("/").filter(Boolean);

  let currentNode = providerNode;
  let currentPath = "";

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    const value = `${providerNode.value}:repository:${currentPath}`;

    let repositoryNode = currentNode.children?.find(
      (node) => node.value === value,
    );

    if (!repositoryNode) {
      repositoryNode = {
        value,
        label: part,
        nodeType: "repository-part",
        children: [],
      };

      currentNode.children ??= [];
      currentNode.children.push(repositoryNode);
    }

    currentNode = repositoryNode;
  }

  currentNode.children ??= [];

  currentNode.children.push({
    value: `${request.providerId}:${request.repository}:mr:${request.id}`,
    label: request.title,
    nodeType: "request",
    request,
  });
}

function sortTree(nodes: MergeRequestTreeNode[]) {
  nodes.sort((a, b) => {
    if (a.nodeType === "request" && b.nodeType === "request") {
      return (
        new Date(b.request!.updatedAt).getTime() -
        new Date(a.request!.updatedAt).getTime()
      );
    }

    if (a.nodeType === "request") {
      return 1;
    }

    if (b.nodeType === "request") {
      return -1;
    }

    return a.label.localeCompare(b.label);
  });

  for (const node of nodes) {
    if (node.children) {
      sortTree(node.children);
    }
  }
}
