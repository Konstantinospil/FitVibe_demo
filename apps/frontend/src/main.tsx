import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./i18n/config";
import { useThemeStore } from "./store/theme.store";

// Remove static login shell if present (progressive enhancement)
const loginShell = document.getElementById("login-shell");
if (loginShell) {
  loginShell.remove();
}

// Initialize theme on app load
const initialTheme = useThemeStore.getState().theme;
document.documentElement.setAttribute("data-theme", initialTheme);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
