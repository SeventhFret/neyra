import { parseUrlFromGitOutput } from "./parsePrUrlFromGitOutput";

type PullRequestAction = {
  url: string;
  kind: "create" | "open";
};

export function parsePullRequestAction(
  output: string,
): PullRequestAction | null {
  const url = parseUrlFromGitOutput(output);

  if (!url) {
    return null;
  }

  const lower = output.toLowerCase();

  const kind =
    lower.includes("create a merge request") ||
    lower.includes("create a pull request")
      ? "create"
      : "open";

  return {
    url,
    kind,
  };
}
