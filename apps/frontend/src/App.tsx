import React from "react";
import AppRouter from "./routes/AppRouter";
import { ToastProvider } from "./contexts/ToastContext";
import CookieConsent from "./components/CookieConsent";

const App: React.FC = () => (
  <ToastProvider>
    <AppRouter />
    <CookieConsent />
  </ToastProvider>
);

export default App;
