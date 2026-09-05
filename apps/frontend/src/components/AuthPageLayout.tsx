import React from "react";
import PageIntro from "./PageIntro";
import Footer from "./Footer";
import BrandLogo from "./BrandLogo";
import HeaderUtilitiesBar from "./HeaderUtilities";

interface AuthPageLayoutProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({ title, description, children }) => {
  return (
    <div
      style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <HeaderUtilitiesBar />
      <div style={{ flex: 1 }}>
        <PageIntro
          title={title}
          description={description}
          priorityLcp
          brand={<BrandLogo priority />}
        >
          {children}
        </PageIntro>
      </div>
      <Footer />
    </div>
  );
};

export default AuthPageLayout;
