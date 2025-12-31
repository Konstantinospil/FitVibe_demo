import React from "react";
import Footer from "./Footer";

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
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
      <Footer />
    </div>
  );
};

export default PublicPageLayout;
