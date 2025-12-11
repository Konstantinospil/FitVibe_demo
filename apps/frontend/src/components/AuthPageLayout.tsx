import React, { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import PageIntro from "./PageIntro";
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
    const { cancel } = scheduleIdleTask(() => setIsReady(true), { timeout: 300 }); // Reduced from 1600ms for faster initial render
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
      <Footer />
    </div>
  );
};

export default AuthPageLayout;
