import React from "react";
import Footer from "./Footer";
import HeaderUtilitiesBar from "./HeaderUtilities";

interface PublicPageLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout wrapper for public pages (Terms, Privacy) that don't use AuthPageLayout.
 * Ensures consistent footer placement and theme/language controls across those pages.
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
      <HeaderUtilitiesBar />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
};

export default PublicPageLayout;
