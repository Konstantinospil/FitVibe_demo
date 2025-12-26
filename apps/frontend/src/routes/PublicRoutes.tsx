import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicPageLayout from "../components/PublicPageLayout";

const Login = lazy(() => import("../pages/Login"));

const TwoFactorVerificationLogin = lazy(() => import("../pages/TwoFactorVerificationLogin"));
const Register = lazy(() => import("../pages/Register"));
const VerifyEmail = lazy(() => import("../pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const Terms = lazy(() => import("../pages/Terms"));
const Privacy = lazy(() => import("../pages/Privacy"));
const Cookie = lazy(() => import("../pages/Cookie"));
const Impressum = lazy(() => import("../pages/Impressum"));
const Contact = lazy(() => import("../pages/Contact"));

const fallback = (
  <div
    className="flex h-screen w-full items-center justify-center text-primary-500"
    role="status"
    aria-live="polite"
  >
    Loading…
  </div>
);

const PublicRoutes: React.FC = () => (
  <Suspense fallback={fallback}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/login/verify-2fa" element={<TwoFactorVerificationLogin />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/terms"
        element={
          <PublicPageLayout>
            <Terms />
          </PublicPageLayout>
        }
      />
      <Route
        path="/privacy"
        element={
          <PublicPageLayout>
            <Privacy />
          </PublicPageLayout>
        }
      />
      <Route
        path="/cookie"
        element={
          <PublicPageLayout>
            <Cookie />
          </PublicPageLayout>
        }
      />
      <Route
        path="/impressum"
        element={
          <PublicPageLayout>
            <Impressum />
          </PublicPageLayout>
        }
      />
      <Route
        path="/contact"
        element={
          <PublicPageLayout>
            <Contact />
          </PublicPageLayout>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </Suspense>
);

export default PublicRoutes;
