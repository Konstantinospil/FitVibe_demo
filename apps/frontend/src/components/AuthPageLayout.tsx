import React, { useEffect, useState } from "react";
import PageIntro from "./PageIntro";
import Footer from "./Footer";
import { scheduleIdleTask } from "../utils/idleScheduler";

// Lazy load header utilities to reduce initial bundle size and TBT
const ThemeToggle = React.lazy(() => import("./ThemeToggle"));
const LanguageSwitcher = React.lazy(() => import("./LanguageSwitcher"));

const HeaderUtilities: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Defer loading header utilities until after initial render to improve LCP
    const { cancel } = scheduleIdleTask(() => setIsReady(true), { timeout: 500 });
    return () => cancel();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <>
      <React.Suspense fallback={null}>
        <ThemeToggle />
      </React.Suspense>
      <React.Suspense fallback={null}>
        <LanguageSwitcher />
      </React.Suspense>
    </>
  );
};

interface AuthPageLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  /** Custom padding for PageIntro section (Solution 4: match shell dimensions) */
  sectionPadding?: string;
  /** Custom max width for PageIntro card (Solution 4: match shell dimensions) */
  cardMaxWidth?: string;
}

const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({
  eyebrow,
  title,
  description,
  children,
  sectionPadding,
  cardMaxWidth,
}) => {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        zIndex: 2, // Ensure React content renders above absolutely positioned shell (Solution 2)
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
      <div style={{ flex: 1 }}>
        <PageIntro
          eyebrow={eyebrow}
          title={title}
          description={description}
          sectionPadding={sectionPadding}
          cardMaxWidth={cardMaxWidth}
        >
          {children}
        </PageIntro>
      </div>
      <Footer />
    </div>
  );
};

export default AuthPageLayout;
