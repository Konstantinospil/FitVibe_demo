import React from "react";
import PageIntro from "./PageIntro";
import Footer from "./Footer";
import { useThemeStore } from "../store/theme.store";

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
  useThemeStore((state) => state.theme);

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
