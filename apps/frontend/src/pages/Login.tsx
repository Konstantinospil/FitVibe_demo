import React from "react";
import { useTranslation } from "react-i18next";
import AuthPageLayout from "../components/AuthPageLayout";
import LoginFormContent from "./LoginFormContent";

const Login: React.FC = () => {
  const { t } = useTranslation();

  return (
    <AuthPageLayout
      eyebrow={t("auth.login.eyebrow")}
      title={t("auth.login.title")}
      description={t("auth.login.description")}
      // Solution 4: Match static shell dimensions to minimize CLS
      // Shell uses padding: 2rem and max-width: 640px
      sectionPadding="2rem"
      cardMaxWidth="640px"
    >
      <LoginFormContent />
    </AuthPageLayout>
  );
};

export default Login;
