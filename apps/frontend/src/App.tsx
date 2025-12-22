import React, { lazy, Suspense } from "react";
import AppRouter from "./routes/AppRouter";
import { ToastProvider } from "./contexts/ToastContext";

// Lazy load CookieConsent since it only shows conditionally and requires cookie translations
const CookieConsent = lazy(() => import("./components/CookieConsent"));

const App: React.FC = () => (
  <ToastProvider>
    <AppRouter />
    <Suspense fallback={null}>
      <CookieConsent />
    </Suspense>
  </ToastProvider>
);

export default App;
