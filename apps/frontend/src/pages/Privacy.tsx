import React from "react";
import { useTranslation } from "react-i18next";
import PageIntro from "../components/PageIntro";
import { Card, CardContent } from "../components/ui";

// Helper function to safely get array from translation
const getTranslationArray = <T,>(translation: unknown, fallback: T[] = []): T[] => {
  if (Array.isArray(translation)) {
    return translation as T[];
  }
  return fallback;
};

const Privacy: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageIntro
      eyebrow={t("privacy.eyebrow")}
      title={t("privacy.title")}
      description={t("privacy.description")}
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
        <CardContent
          className="text-095 text-primary"
          style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem", lineHeight: 1.8 }}
        >
          <div className="mb-1 text-muted text-09">
            <strong>{t("privacy.effectiveDate")}:</strong> {t("privacy.effectiveDateValue")}
          </div>

          <p className="section-text">{t("privacy.intro1")}</p>

          <p className="section-text">{t("privacy.intro2")}</p>

          <section className="section">
            <h2 className="section-title">{t("privacy.section1.title")}</h2>
            <p className="section-text">{t("privacy.section1.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section1.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item" dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section2.title")}</h2>
            <ul className="list">
              <li className="list-item">
                <strong>{t("privacy.section2.controller")}</strong>{" "}
                {t("privacy.section2.controllerValue")}
              </li>
              <li className="list-item">
                <strong>{t("privacy.section2.privacyInquiries")}</strong>{" "}
                {t("privacy.section2.privacyInquiriesValue")}
              </li>
              <li className="list-item">
                <strong>{t("privacy.section2.dpo")}</strong> {t("privacy.section2.dpoValue")}
              </li>
              <li className="list-item">
                <strong>{t("privacy.section2.euRepresentative")}</strong>{" "}
                {t("privacy.section2.euRepresentativeValue")}
              </li>
            </ul>
            <p className="section-text">{t("privacy.section2.contactNote")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section3.title")}</h2>
            <p className="section-text">{t("privacy.section3.subtitle")}</p>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {t("privacy.section3.table.headers.category")}
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {t("privacy.section3.table.headers.examples")}
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {t("privacy.section3.table.headers.source")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.accountData.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.accountData.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.accountData.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.profilePreferences.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.profilePreferences.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.profilePreferences.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.trainingWellness.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.trainingWellness.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.trainingWellness.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.socialCommunity.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.socialCommunity.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.socialCommunity.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.deviceTechnical.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.deviceTechnical.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.deviceTechnical.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.usageDiagnostics.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.usageDiagnostics.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.usageDiagnostics.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.supportCommunication.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.supportCommunication.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.supportCommunication.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.paymentBilling.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.paymentBilling.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.paymentBilling.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.cookiesIds.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.cookiesIds.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.cookiesIds.source")}
                  </td>
                </tr>
              </tbody>
            </table>
            <p
              className="section-text"
              dangerouslySetInnerHTML={{ __html: t("privacy.section3.specialCategoriesNote") }}
            />
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section4.title")}</h2>
            <p className="section-text">{t("privacy.section4.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section4.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item" dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section5.title")}</h2>
            <p className="section-text">{t("privacy.section5.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section5.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section6.title")}</h2>
            <p className="section-text">{t("privacy.section6.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<{ title: string; content: string }>(
                t("privacy.section6.items", { returnObjects: true }),
              ).map((item: { title: string; content: string }, index: number) => (
                <li key={index} className="list-item">
                  <strong>{item.title}</strong> {item.content}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section7.title")}</h2>
            <p className="section-text">{t("privacy.section7.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section7.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section7.cookieNote")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section8.title")}</h2>
            <p
              className="section-text"
              dangerouslySetInnerHTML={{ __html: t("privacy.section8.notSold") }}
            />
            <p className="section-text">{t("privacy.section8.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<{ title: string; content: string }>(
                t("privacy.section8.items", { returnObjects: true }),
              ).map((item: { title: string; content: string }, index: number) => (
                <li key={index} className="list-item">
                  <strong>{item.title}</strong> {item.content}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section9.title")}</h2>
            <p className="section-text">{t("privacy.section9.paragraph1")}</p>
            <p className="section-text">{t("privacy.section9.paragraph2")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section9.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section9.paragraph3")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section10.title")}</h2>
            <p className="section-text">{t("privacy.section10.paragraph1")}</p>
            <p className="section-text">{t("privacy.section10.paragraph2")}</p>
            <ul className="list">
              {getTranslationArray<{ title: string; content: string }>(
                t("privacy.section10.items", { returnObjects: true }),
              ).map((item: { title: string; content: string }, index: number) => (
                <li key={index} className="list-item">
                  <strong>{item.title}</strong> {item.content}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section10.paragraph3")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section11.title")}</h2>
            <p className="section-text">{t("privacy.section11.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section11.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section11.note")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section12.title")}</h2>
            <p className="section-text">{t("privacy.section12.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<{ title: string; content: string }>(
                t("privacy.section12.items", { returnObjects: true }),
              ).map((item: { title: string; content: string }, index: number) => (
                <li key={index} className="list-item">
                  <strong>{item.title}</strong> {item.content}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section12.additionalRights")}</p>
            <p className="section-text">{t("privacy.section12.exerciseRights")}</p>
            <p className="section-text">{t("privacy.section12.verification")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section13.title")}</h2>
            <p
              className="section-text"
              dangerouslySetInnerHTML={{ __html: t("privacy.section13.subtitle") }}
            />
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section13.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section13.contact")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section14.title")}</h2>
            <p
              className="section-text"
              dangerouslySetInnerHTML={{ __html: t("privacy.section14.paragraph1") }}
            />
            <p className="section-text">{t("privacy.section14.paragraph2")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section15.title")}</h2>
            <p className="section-text">{t("privacy.section15.paragraph1")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section15.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section15.paragraph2")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section16.title")}</h2>
            <p className="section-text">{t("privacy.section16.subtitle")}</p>
            <ul className="list">
              <li className="list-item">
                <strong>{t("privacy.section16.email")}</strong> {t("privacy.section16.emailValue")}
              </li>
              <li className="list-item">
                <strong>{t("privacy.section16.dpo")}</strong> {t("privacy.section16.dpoValue")}
              </li>
            </ul>
            <p className="section-text">{t("privacy.section16.responseTime")}</p>
          </section>
        </CardContent>
      </Card>
    </PageIntro>
  );
};

export default Privacy;
