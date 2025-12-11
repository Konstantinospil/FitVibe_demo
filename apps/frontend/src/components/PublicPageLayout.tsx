import React from "react";
import Footer from "./Footer";

interface PublicPageLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout wrapper for public pages (Terms, Privacy) that don't use AuthPageLayout.
 * Ensures consistent footer placement across all pages.
 */
const PublicPageLayout: React.FC<PublicPageLayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
};

export default PublicPageLayout;
