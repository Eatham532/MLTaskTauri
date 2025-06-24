import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {ThemeProvider} from "@/components/theme-providor.tsx";
import { Toaster } from "@/components/ui/sonner"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme={"system"} storageKey="vite-ui-theme">
      <App />
      <Toaster position={"bottom-left"} />
    </ThemeProvider>
  </React.StrictMode>,
);
