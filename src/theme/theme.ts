import {
  createTheme,
  MantineColorsTuple,
  Input,
  InputWrapper,
  Button,
  Checkbox,
  Notification,
  Drawer,
  Kbd,
  Select,
  CSSVariablesResolver,
  defaultVariantColorsResolver,
  VariantColorsResolver,
} from "@mantine/core";

import classes from "./theme.module.css";

const neyraBlue: MantineColorsTuple = [
  "#edf5ff",
  "#d9e9ff",
  "#b1d2ff",
  "#86b9ff",
  "rgb(100, 164, 255)",
  "rgb(77, 150, 255)",
  "rgb(59, 130, 246)",
  "#2f6fd8",
  "#255db9",
  "#1c4b97",
];

const neyraCyan: MantineColorsTuple = [
  "#e8fcff",
  "#d2f7fb",
  "#a9ebf2",
  "#7edee9",
  "#5bd3e1",
  "#44cbd9",
  "#2bb6c5",
  "#20929f",
  "#197681",
  "#135e67",
];

export const resolver: CSSVariablesResolver = () => ({
  variables: {},

  light: {},

  dark: {
    "--mantine-color-dimmed": "var(--neyra-text-muted)",
    "--mantine-color-disabled": "var(--neyra-disabled-bg)",
    "--mantine-color-disabled-color": "var(--neyra-text-muted)",
    "--mantine-color-disabled-border": "var(--neyra-border-soft)",
  },
});

const variantColorResolver: VariantColorsResolver = (input) => {
  const defaults = defaultVariantColorsResolver(input);

  // Important:

  // keep explicit colors such as color="red", color="green", etc.

  // behaving normally.

  const isPrimary = !input.color || input.color === input.theme.primaryColor;

  if (!isPrimary) {
    return defaults;
  }

  switch (input.variant) {
    case "filled":
      return {
        background: "var(--neyra-primary)",
        hover: "var(--neyra-primary-hover)",
        color: "var(--neyra-primary-fg)",
        border:
          "1px solid color-mix(in srgb, var(--mantine-color-neyraBlue-3) 35%, transparent)",
        hoverColor: "#ffffff",
      };

    case "light":
      return {
        background:
          "color-mix(in srgb, var(--mantine-color-neyraBlue-5) 13%, transparent)",
        hover:
          "color-mix(in srgb, var(--mantine-color-neyraBlue-5) 20%, transparent)",
        color: "var(--mantine-color-neyraBlue-3)",
        border:
          "1px solid color-mix(in srgb, var(--mantine-color-neyraBlue-5) 18%, transparent)",
        hoverColor: "var(--mantine-color-neyraBlue-2)",
      };

    case "outline":
      return {
        background: "transparent",
        hover:
          "color-mix(in srgb, var(--mantine-color-neyraBlue-5) 10%, transparent)",
        color: "var(--mantine-color-neyraBlue-3)",
        border:
          "1px solid color-mix(in srgb, var(--mantine-color-neyraBlue-4) 45%, var(--neyra-border))",
        hoverColor: "var(--mantine-color-neyraBlue-2)",
      };

    case "default":
      return {
        background: "var(--neyra-surface-2)",
        hover: "var(--neyra-surface-3)",
        color: "var(--neyra-text-primary)",
        border: "1px solid var(--neyra-border)",
        hoverColor: "var(--neyra-text-primary)",
      };

    case "subtle":
      return {
        background: "transparent",
        hover:
          "color-mix(in srgb, var(--mantine-color-neyraCyan-5) 9%, transparent)",
        color: "var(--neyra-text-secondary)",
        border: "1px solid transparent",
        hoverColor: "var(--neyra-text-primary)",
      };

    case "transparent":
      return {
        background: "transparent",
        hover: "transparent",
        color: "var(--mantine-color-neyraBlue-3)",
        border: "1px solid transparent",
        hoverColor: "var(--mantine-color-neyraCyan-3)",
      };

    case "white":
      return {
        background: "var(--neyra-text-primary)",
        hover: "#dfe8ef",
        color: "var(--neyra-bg)",
        border: "1px solid transparent",
        hoverColor: "var(--neyra-bg)",
      };

    default:
      return defaults;
  }
};

export const theme = createTheme({
  primaryColor: "neyraBlue",

  primaryShade: {
    light: 6,
    dark: 5,
  },

  colors: {
    neyraBlue,
    neyraCyan,
  },

  variantColorResolver,

  defaultRadius: "md",
  defaultGradient: {
    from: "neyraBlue.5",
    to: "neyraCyan.5",
    deg: 90,
  },

  radius: {
    xs: "4px",
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "20px",
  },

  spacing: {
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },

  components: {
    Input: Input.extend({
      classNames: {
        input: classes.input,
      },
    }),
    Kbd: Kbd.extend({
      classNames: {
        root: classes.kbd,
      },
    }),

    InputWrapper: InputWrapper.extend({
      styles: {
        label: {
          color: "var(--neyra-text-secondary)",
        },

        description: {
          color: "var(--neyra-text-muted)",
        },
      },
    }),
    Tooltip: {
      styles: {
        tooltip: {
          backgroundColor: "var(--neyra-surface-3)",
          color: "var(--neyra-text-primary)",
          border: "1px solid var(--neyra-border)",
        },
      },
    },
    Paper: {
      styles: {
        root: {
          backgroundColor: "var(--neyra-surface-2)",
        },
      },
    },
    Autocomplete: {
      classNames: {
        dropdown: classes.autocompleteDropdown,
        option: classes.autocompleteOption,
      },
    },
    Select: Select.extend({
      classNames: {
        dropdown: classes.selectDropdown,
        option: classes.selectOption,
      },
    }),
    Button: Button.extend({
      defaultProps: {
        radius: "md",
      },

      classNames: {
        root: classes.button,
        label: classes.buttonLabel,
      },
    }),
    Notification: Notification.extend({
      classNames: {
        root: classes.notification,
        icon: classes.notificationIcon,
        body: classes.notificationBody,
        title: classes.notificationTitle,
        description: classes.notificationDescription,
        closeButton: classes.notificationClose,
      },
    }),
    Checkbox: Checkbox.extend({
      classNames: {
        root: classes.checkboxRoot,
        input: classes.checkboxInput,
        icon: classes.checkboxIcon,
        label: classes.checkboxLabel,
        description: classes.checkboxDescription,
      },
    }),
    Drawer: Drawer.extend({
      classNames: {
        inner: classes.drawerInner,
        content: classes.drawerContent,
        header: classes.drawerHeader,
        title: classes.drawerTitle,
        body: classes.drawerBody,
        close: classes.drawerClose,
        overlay: classes.drawerOverlay,
      },
    }),
  },

  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

  fontFamilyMonospace:
    '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
});
