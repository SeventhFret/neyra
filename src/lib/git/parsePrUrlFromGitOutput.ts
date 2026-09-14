export function parseUrlFromGitOutput(output: string): string | null {
  const urlLines = output
    .split("\n")
    .filter((line) => line.includes("remote: ") && line.includes("https://"));

  if (urlLines.length == 0) {
    return null;
  }
  const urlLine = urlLines[0];

  const sanitizedUrl = urlLine.slice(urlLine.indexOf("https://")).trim();
  const searchQueries = ["/pull/new", "/merge_requests/"];

  if (searchQueries.some((query) => sanitizedUrl.includes(query))) {
    return sanitizedUrl;
  }

  return null;
}
