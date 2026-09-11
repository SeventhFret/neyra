import React from "react";
import ReactDOM from "react-dom/client";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import App from "./App";
import { theme, resolver } from "./theme/theme";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={resolver}
      defaultColorScheme="dark"
    >
      {/* Default cap is 200px, applied as an inline max-height on a container
          with overflow: hidden — it silently clips git output and its scrollbar.
          This only has to stay above whatever the notification content caps at. */}
      <Notifications notificationMaxHeight={500} />
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
