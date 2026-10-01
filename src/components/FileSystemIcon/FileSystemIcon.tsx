import { useEffect, useState } from "react";
import { IconFile, IconFolder, IconFolderOpen } from "@tabler/icons-react";

import type { FileSystemIconProps } from "./FileSystemIcon.types";
import { resolveFileSystemIcon } from "./materialIconTheme";
import classes from "./FileSystemIcon.module.css";

export default function FileSystemIcon({
  path,
  directory = false,
  expanded = false,
  size = 16,
  className,
}: FileSystemIconProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIconUrl(null);

    void resolveFileSystemIcon(path, directory, expanded).then((url) => {
      if (!cancelled) {
        setIconUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path, directory, expanded]);

  const combinedClassName = [classes.icon, className].filter(Boolean).join(" ");

  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className={combinedClassName}
      />
    );
  }

  if (directory) {
    return expanded ? (
      <IconFolderOpen size={size} className={combinedClassName} />
    ) : (
      <IconFolder size={size} className={combinedClassName} />
    );
  }

  return <IconFile size={size} className={combinedClassName} />;
}
