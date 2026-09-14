import { useEffect } from "react";

const BLOCKED_DEFAULT_SHORTCUTS = new Set(["p", "g"]);

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;

      if (!modifier) {
        return;
      }

      const key = event.key.toLowerCase();

      if (BLOCKED_DEFAULT_SHORTCUTS.has(key)) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
