import { Group, Kbd } from "@mantine/core";
import { platform } from "@tauri-apps/plugin-os";
import type { Shortcut } from "./ShortcutKeys.types";

const currentPlatform = platform();
const isMac = currentPlatform === "macos";

export default function ShortcutKeys({ shortcut }: { shortcut: Shortcut }) {
  const modifiers = shortcut.modifiers ?? [];

  return (
    <Group gap={4} wrap="nowrap">
      {modifiers.map((modifier) => {
        switch (modifier) {
          case "mod":
            return (
              <Kbd key="mod" size="xs">
                {isMac ? "⌘" : "Ctrl"}
              </Kbd>
            );

          case "alt":
            return (
              <Kbd key="alt" size="xs">
                {isMac ? "⌥" : "Alt"}
              </Kbd>
            );

          case "shift":
            return (
              <Kbd key="shift" size="xs">
                {isMac ? "⇧" : "Shift"}
              </Kbd>
            );
        }
      })}

      <Kbd size="xs">{shortcut.key}</Kbd>
    </Group>
  );
}
