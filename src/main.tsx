import React from "react";
import ReactDOM from "react-dom/client";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import App from "./App";
import themeClasses from "./theme/theme.module.css";
import { theme, resolver } from "./theme/theme";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={resolver}
      defaultColorScheme="dark"
    >
      <Notifications
        notificationMaxHeight={500}
        className={themeClasses.notifications}
      />
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
