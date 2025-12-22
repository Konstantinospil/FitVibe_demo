import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui";

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  /** Custom padding for the section container (default: "5rem 1.5rem") */
  sectionPadding?: string;
  /** Custom max width for the card (default: "900px") */
  cardMaxWidth?: string;
}

// Separate concerns: layout container vs typography
const eyebrowContainerStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.6rem",
};

const eyebrowTextStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
};

const accentLineStyle: React.CSSProperties = {
  width: "24px",
  height: "2px",
  background: "var(--color-accent)",
};

const PageIntro: React.FC<PageIntroProps> = ({
  eyebrow,
  title,
  description,
  children,
  sectionPadding = "5rem 1.5rem",
  cardMaxWidth = "900px",
}) => (
  <section
    style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: sectionPadding,
    }}
  >
    <Card
      as="article"
      style={{
        maxWidth: cardMaxWidth,
        width: "100%",
        padding: "0",
        gap: "0",
      }}
    >
      <CardHeader
        style={{
          padding: "3rem clamp(1.5rem, 5vw, 3.5rem) 1.5rem",
          gap: "1rem",
        }}
      >
        <span style={eyebrowContainerStyle}>
          <span style={accentLineStyle} aria-hidden="true" />
          <span style={eyebrowTextStyle}>{eyebrow}</span>
        </span>
        <CardTitle
          style={{
            fontSize: "clamp(2rem, 4vw, 2.8rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
          }}
        >
          {title}
        </CardTitle>
        <CardDescription
          style={{
            fontSize: "1rem",
            lineHeight: 1.6,
          }}
        >
          {description}
        </CardDescription>
      </CardHeader>
      {children ? (
        <CardContent
          style={{
            padding: "0 3rem 3rem",
            gap: "1.5rem",
          }}
        >
          {children}
        </CardContent>
      ) : null}
    </Card>
  </section>
);

export default PageIntro;
