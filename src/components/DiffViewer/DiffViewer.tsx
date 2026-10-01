import { Loader, Text } from "@mantine/core";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { codeToTokens, type BundledLanguage, type ThemedToken } from "shiki";

import type { DiffHunk, DiffLine, FileDiff } from "./DiffViewer.types";

import classes from "./DiffViewer.module.css";

interface DiffViewerProps {
  diff: FileDiff;
}

interface HighlightedHunk {
  hunk: DiffHunk;
  lines: HighlightedLine[];
}

interface HighlightedLine {
  line: DiffLine;
  tokens: ThemedToken[];
}

const THEME = "andromeeda";

export default function DiffViewer({ diff }: DiffViewerProps) {
  const path = diff.newPath ?? diff.oldPath ?? "";
  const language = getLanguageFromPath(path);

  const [highlightedHunks, setHighlightedHunks] = useState<HighlightedHunk[]>(
    [],
  );
  const [isHighlighting, setIsHighlighting] = useState(false);

  const source = useMemo(
    () =>
      diff.hunks
        .flatMap((hunk) => hunk.lines)
        .map((line) => line.content)
        .join("\n"),
    [diff],
  );

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      setIsHighlighting(true);

      try {
        const result = await codeToTokens(source, {
          lang: language,
          theme: THEME,
        });

        if (cancelled) {
          return;
        }

        let tokenIndex = 0;

        const hunks = diff.hunks.map((hunk) => ({
          hunk,
          lines: hunk.lines.map((line) => ({
            line,
            tokens: result.tokens[tokenIndex++] ?? [],
          })),
        }));

        setHighlightedHunks(hunks);
      } finally {
        if (!cancelled) {
          setIsHighlighting(false);
        }
      }
    };

    void highlight();

    return () => {
      cancelled = true;
    };
  }, [diff, language, source]);

  if (diff.binary) {
    return (
      <div className={classes.message}>
        <Text size="sm" c="dimmed">
          Binary files cannot be displayed.
        </Text>
      </div>
    );
  }

  if (diff.hunks.length === 0) {
    return (
      <div className={classes.message}>
        <Text size="sm" c="dimmed">
          No textual changes to display.
        </Text>
      </div>
    );
  }

  if (isHighlighting && highlightedHunks.length === 0) {
    return (
      <div className={classes.message}>
        <Loader size="sm" />
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.fileHeader}>
        <Text ff="monospace" size="sm" fw={500} className={classes.filePath}>
          {path}
        </Text>

        <Text size="xs" className={classes.fileStatus}>
          {formatStatus(diff.status)}
        </Text>
      </div>

      <div className={classes.diff}>
        {highlightedHunks.map(({ hunk, lines }, hunkIndex) => (
          <div key={hunkIndex} className={classes.hunk}>
            <div className={classes.hunkHeader}>
              <span className={classes.emptyGutter} />
              <span className={classes.emptyGutter} />

              <code className={classes.hunkHeaderText}>{hunk.header}</code>
            </div>

            {lines.map(({ line, tokens }, lineIndex) => (
              <DiffLineRow key={lineIndex} line={line} tokens={tokens} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiffLineRow({
  line,
  tokens,
}: {
  line: DiffLine;
  tokens: ThemedToken[];
}) {
  return (
    <div className={`${classes.diffRow} ${getLineClassName(line.kind)}`}>
      <div className={classes.lineNumber}>{line.oldLineNumber ?? ""}</div>

      <div className={classes.lineNumber}>{line.newLineNumber ?? ""}</div>

      <div className={classes.code}>
        <span className={classes.marker}>{getLineMarker(line.kind)}</span>

        <code className={classes.codeContent}>
          {tokens.map((token, tokenIndex) => (
            <span key={tokenIndex} style={getTokenStyle(token)}>
              {token.content}
            </span>
          ))}
        </code>
      </div>
    </div>
  );
}

function getLineClassName(kind: DiffLine["kind"]) {
  switch (kind) {
    case "addition":
      return classes.addition;

    case "deletion":
      return classes.deletion;

    case "context":
      return classes.context;
  }
}

function getLineMarker(kind: DiffLine["kind"]) {
  switch (kind) {
    case "addition":
      return "+";

    case "deletion":
      return "-";

    case "context":
      return " ";
  }
}

function formatStatus(status: FileDiff["status"]) {
  switch (status) {
    case "typeChanged":
      return "Type changed";

    case "untracked":
      return "Untracked";

    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function getTokenStyle(token: ThemedToken): CSSProperties {
  const fontStyle = token.fontStyle ?? 0;

  return {
    color: token.color,
    fontStyle: (fontStyle & 1) !== 0 ? "italic" : undefined,
    fontWeight: (fontStyle & 2) !== 0 ? "bold" : undefined,
    textDecoration: (fontStyle & 4) !== 0 ? "underline" : undefined,
  };
}

function getLanguageFromPath(path: string): BundledLanguage | "text" {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "ts":
      return "typescript";

    case "tsx":
      return "tsx";

    case "js":
    case "mjs":
    case "cjs":
      return "javascript";

    case "jsx":
      return "jsx";

    case "rs":
      return "rust";

    case "py":
      return "python";

    case "json":
      return "json";

    case "css":
      return "css";

    case "scss":
      return "scss";

    case "html":
      return "html";

    case "md":
      return "markdown";

    case "yml":
    case "yaml":
      return "yaml";

    case "toml":
      return "toml";

    case "sh":
    case "bash":
      return "bash";

    default:
      return "text";
  }
}
