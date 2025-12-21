import React, { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import Footer from "./Footer";
import { scheduleIdleTask } from "../utils/idleScheduler";

const headerSkeletonStyle: React.CSSProperties = {
  width: "48px",
  height: "40px",
  borderRadius: "999px",
  background: "var(--color-surface-muted)",
  border: "1px solid var(--color-border)",
  animation: "pulse 1.4s ease-in-out infinite",
};

const HeaderUtilities: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const { cancel } = scheduleIdleTask(() => setIsReady(true), { timeout: 300 });
    return () => cancel();
  }, []);

  if (!isReady) {
    return (
      <>
        <span aria-hidden="true" style={headerSkeletonStyle} />
        <span aria-hidden="true" style={headerSkeletonStyle} />
      </>
    );
  }

  return (
    <>
      <ThemeToggle />
      <LanguageSwitcher />
    </>
  );
};

interface PublicPageLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout wrapper for public pages (Terms, Privacy) that don't use AuthPageLayout.
 * Provides header utilities (theme toggle, language switcher) and footer,
 * matching the AuthPageLayout style for consistency.
 */
const PublicPageLayout: React.FC<PublicPageLayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          zIndex: 10,
        }}
      >
        <HeaderUtilities />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
      <Footer />
    </div>
  );
};

export default PublicPageLayout;
