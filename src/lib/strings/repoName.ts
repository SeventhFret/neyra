export function repoName(path: string) {
  const parts = path.split(/[\\/]/).filter(Boolean);

  return parts.length > 0 ? parts[parts.length - 1] : path;
}
