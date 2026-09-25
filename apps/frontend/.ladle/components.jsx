import React, { useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import "../src/styles/global.css";
import { ToastProvider } from "../src/contexts/ToastContext";
import { useAuthStore } from "../src/store/auth.store";
import { loadFullTranslations, minimalTranslationsReady } from "../src/i18n/config";
import "../src/gallery/mockApi";

const GALLERY_USER = {
  id: "gallery-user",
  username: "gallery",
  displayName: "Gallery Athlete",
  email: "gallery@fitvibe.local",
  role: "admin",
};

if (typeof window !== "undefined") {
  useAuthStore.setState({
    isAuthenticated: true,
    user: GALLERY_USER,
  });
  void minimalTranslationsReady.then(() => loadFullTranslations());
}

export const Provider = ({ children, globalState }) => {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: Infinity },
          mutations: { retry: false },
        },
      }),
    [],
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      globalState?.theme === "light" ? "light" : "dark",
    );
  }, [globalState?.theme]);

  return (
    <MemoryRouter initialEntries={["/"]}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>{children}</div>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};
