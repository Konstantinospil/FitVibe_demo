import React, { useEffect, useState, lazy, Suspense } from "react";
import PageIntro from "./PageIntro";
import { scheduleIdleTask } from "../utils/idleScheduler";

// Lazy load header utilities to reduce initial bundle size and TBT
const ThemeToggle = lazy(() => import("./ThemeToggle"));
const LanguageSwitcher = lazy(() => import("./LanguageSwitcher"));
const Footer = lazy(() => import("./Footer"));

const HeaderUtilities: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Defer loading header utilities until after initial render to improve LCP
    const { cancel } = scheduleIdleTask(() => setIsReady(true), { timeout: 1000 });
    return () => cancel();
  }, []);

  if (!isReady) {
    // Show nothing during initial render to avoid blocking
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ThemeToggle />
      <LanguageSwitcher />
    </Suspense>
  );
};

interface AuthPageLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}

const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({
  eyebrow,
  title,
  description,
  children,
}) => {
  return (
    <div
      style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column" }}
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
      <div style={{ flex: 1 }}>
        <PageIntro eyebrow={eyebrow} title={title} description={description}>
          {children}
        </PageIntro>
      </div>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default AuthPageLayout;
