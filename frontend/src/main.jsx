import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mantine/core/styles.layer.css";
import "@mantine/notifications/styles.layer.css";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { AuthProvider } from "./contexts/AuthContexts";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MantineProvider>
      <Notifications />
      <AuthProvider>
        <App />
      </AuthProvider>
    </MantineProvider>
  </StrictMode>,
);
