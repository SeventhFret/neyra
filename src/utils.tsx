// import { Text, Button, Stack, Group } from "@mantine/core";
// import { notifications } from "@mantine/notifications";
// import {
//   IconCircleCheck,
//   IconExclamationCircle,
//   IconLink,
// } from "@tabler/icons-react";
// import { useNotificationStore } from "./stores/notifications/store";
// import { openUrl } from "@tauri-apps/plugin-opener";
// import { NotificationMessageFormat } from "./stores/notifications/store.types";

// export interface GitNotification {
//   title: string;
//   /** Raw git output, or an error thrown by `invoke` — both are stringified. */
//   message: unknown;
// }

// export interface GitNotificationSuccess extends GitNotification {
//   prUrl?: string;
//   messageFormat?: NotificationMessageFormat;
// }

// function createPrAction(prUrl?: string) {
//   if (!prUrl) {
//     return undefined;
//   }

//   return {
//     label: "Create PR/MR",
//     icon: IconLink,
//     onClick: async () => {
//       await openUrl(prUrl);
//     },
//   };
// }

// export const parseUrlFromCommitStatus = (msg: string) => {
//   const urlLines = msg
//     .split("\n")
//     .filter((line) => line.includes("remote: ") && line.includes("https://"));

//   if (urlLines.length == 0) {
//     return;
//   }
//   const urlLine = urlLines[0];

//   return urlLine.slice(urlLine.indexOf("https://")).trim();
// };
