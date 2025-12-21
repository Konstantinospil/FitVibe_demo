import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { ensurePrivateTranslationsLoaded } from "../i18n/config";

const ProtectedRoute = lazy(() => import("../components/ProtectedRoute"));
const AdminRoute = lazy(() => import("../components/AdminRoute"));
const MainLayout = lazy(() => import("../layouts/MainLayout"));
const Home = lazy(() => import("../pages/Home"));
const Sessions = lazy(() => import("../pages/Sessions"));
const Planner = lazy(() => import("../pages/Planner"));
const Logger = lazy(() => import("../pages/Logger"));
const Insights = lazy(() => import("../pages/Insights"));
const Profile = lazy(() => import("../pages/Profile"));
const Settings = lazy(() => import("../pages/Settings"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const ContentReports = lazy(() => import("../pages/admin/ContentReports"));
const UserManagement = lazy(() => import("../pages/admin/UserManagement"));
const SystemControls = lazy(() => import("../pages/admin/SystemControls"));
const NotFound = lazy(() => import("../pages/NotFound"));
const Terms = lazy(() => import("../pages/Terms"));
const Privacy = lazy(() => import("../pages/Privacy"));
const Cookie = lazy(() => import("../pages/Cookie"));
const Impressum = lazy(() => import("../pages/Impressum"));
const Contact = lazy(() => import("../pages/Contact"));
const TermsReacceptance = lazy(() => import("../pages/TermsReacceptance"));

const fallback = (
  <div
    className="flex h-screen w-full items-center justify-center text-primary-500"
    role="status"
    aria-live="polite"
  >
    Loading app…
  </div>
);

const ProtectedRoutes: React.FC = () => {
  useEffect(() => {
    void ensurePrivateTranslationsLoaded();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={fallback}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="planner" element={<Planner />} />
              <Route path="logger/:sessionId" element={<Logger />} />
              <Route path="insights" element={<Insights />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="terms" element={<Terms />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="cookie" element={<Cookie />} />
              <Route path="impressum" element={<Impressum />} />
              <Route path="contact" element={<Contact />} />
              <Route path="terms-reacceptance" element={<TermsReacceptance />} />
              <Route path="admin" element={<AdminRoute />}>
                <Route index element={<AdminDashboard />} />
                <Route path="reports" element={<ContentReports />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="system" element={<SystemControls />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </QueryClientProvider>
  );
};

export default ProtectedRoutes;
