import React from "react";
import { useTranslation } from "react-i18next";
import PageIntro from "../components/PageIntro";
import { Card, CardContent } from "../components/ui";

const contentStyle: React.CSSProperties = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "2rem",
  lineHeight: 1.8,
  color: "var(--color-text-primary)",
  fontSize: "0.95rem",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "2.5rem",
};

const headingStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 600,
  marginBottom: "1rem",
  marginTop: "2rem",
  color: "var(--color-text-primary)",
};

const paragraphStyle: React.CSSProperties = {
  marginBottom: "1rem",
  color: "var(--color-text-secondary)",
};

const listStyle: React.CSSProperties = {
  marginLeft: "1.5rem",
  marginBottom: "1rem",
  color: "var(--color-text-secondary)",
  listStyleType: "disc",
};

const listItemStyle: React.CSSProperties = {
  marginBottom: "0.75rem",
};

const Terms: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageIntro
      eyebrow={t("terms.eyebrow")}
      title={t("terms.title")}
      description={t("terms.description")}
    >
      <Card
        style={{
          maxWidth: "900px",
          width: "100%",
          margin: "0 auto",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <CardContent style={contentStyle}>
          <div
            style={{ marginBottom: "1rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}
          >
            <strong>{t("terms.effectiveDate")}:</strong> {t("terms.effectiveDateValue")}
          </div>

          <p className="section-text">{t("terms.intro")}</p>

          <section className="section">
            <h2 className="section-title">{t("terms.section1.title")}</h2>
            <ul className="list">
              {(t("terms.section1.items", { returnObjects: true }) as string[]).map(
                (item: string, index: number) => (
                  <li key={index} className="list-item">
                    {item}
                  </li>
                ),
              )}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section2.title")}</h2>
            <ul className="list">
              {(t("terms.section2.items", { returnObjects: true }) as string[]).map(
                (item: string, index: number) => (
                  <li key={index} className="list-item">
                    {item}
                  </li>
                ),
              )}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section3.title")}</h2>
            <p className="section-text">{t("terms.section3.subtitle")}</p>
            <ul className="list">
              {(t("terms.section3.items", { returnObjects: true }) as string[]).map(
                (item: string, index: number) => (
                  <li key={index} className="list-item">
                    {item}
                  </li>
                ),
              )}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section4.title")}</h2>
            <ul className="list">
              {(t("terms.section4.items", { returnObjects: true }) as string[]).map(
                (item: string, index: number) => (
                  <li key={index} className="list-item">
                    {item}
                  </li>
                ),
              )}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section5.title")}</h2>
            <p className="section-text">{t("terms.section5.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section6.title")}</h2>
            <p className="section-text">{t("terms.section6.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section7.title")}</h2>
            <ul className="list">
              {(t("terms.section7.items", { returnObjects: true }) as string[]).map(
                (item: string, index: number) => (
                  <li key={index} className="list-item">
                    {item}
                  </li>
                ),
              )}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section8.title")}</h2>
            <ul className="list">
              {(t("terms.section8.items", { returnObjects: true }) as string[]).map(
                (item: string, index: number) => (
                  <li key={index} className="list-item">
                    {item}
                  </li>
                ),
              )}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section9.title")}</h2>
            <p className="section-text">{t("terms.section9.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section10.title")}</h2>
            <p className="section-text">{t("terms.section10.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section11.title")}</h2>
            <p className="section-text">{t("terms.section11.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section12.title")}</h2>
            <p className="section-text">{t("terms.section12.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section13.title")}</h2>
            <p className="section-text">{t("terms.section13.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section14.title")}</h2>
            <ul className="list">
              {(t("terms.section14.items", { returnObjects: true }) as string[]).map(
                (item: string, index: number) => (
                  <li key={index} className="list-item">
                    {item}
                  </li>
                ),
              )}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section15.title")}</h2>
            <ul className="list">
              {(t("terms.section15.items", { returnObjects: true }) as string[]).map(
                (item: string, index: number) => (
                  <li key={index} className="list-item">
                    {item}
                  </li>
                ),
              )}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section16.title")}</h2>
            <p className="section-text">{t("terms.section16.content")}</p>
          </section>
        </CardContent>
      </Card>
    </PageIntro>
  );
};

export default Terms;
