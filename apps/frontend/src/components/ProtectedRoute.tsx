import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getLegalDocumentsStatus } from "../services/api";

const TERMS_GATE_ALLOWED_PATHS = new Set([
  "/terms-reacceptance",
  "/terms",
  "/privacy",
  "/cookie",
  "/impressum",
  "/contact",
  "/settings",
]);

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [termsAcceptanceRequired, setTermsAcceptanceRequired] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      setTermsAcceptanceRequired(null);
      return () => {
        cancelled = true;
      };
    }

    void getLegalDocumentsStatus()
      .then((status) => {
        if (!cancelled) {
          setTermsAcceptanceRequired(status.terms.needsAcceptance);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTermsAcceptanceRequired(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (termsAcceptanceRequired === null) {
    return null;
  }

  if (termsAcceptanceRequired && !TERMS_GATE_ALLOWED_PATHS.has(location.pathname)) {
    return <Navigate to="/terms-reacceptance" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
