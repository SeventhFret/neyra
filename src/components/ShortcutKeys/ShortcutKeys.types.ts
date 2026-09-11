export type ShortcutModifier = "mod" | "alt" | "shift";

export type Shortcut = {
  modifiers?: ShortcutModifier[];
  key: string;
};
