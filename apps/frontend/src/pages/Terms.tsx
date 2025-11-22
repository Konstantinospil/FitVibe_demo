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
            <strong>{t("terms.effectiveDate")}:</strong> 2024-06-01
          </div>

          <p style={paragraphStyle}>
            These Terms and Conditions / End User License Agreement ("Terms") govern your access to
            and use of the FitVibe websites, mobile applications, APIs, and related services
            (collectively, the "Services"). By using the Services, you agree to these Terms and to
            the Privacy Policy and Cookie Policy.
          </p>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>1. Eligibility and account registration</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                You must be at least 16 years old or the age required by your jurisdiction. If you
                are agreeing on behalf of an organization, you represent that you have authority to
                bind it.
              </li>
              <li style={listItemStyle}>
                You are responsible for maintaining accurate account information and for
                safeguarding login credentials. Notify FitVibe immediately of unauthorized use.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>2. License grant and intellectual property</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                FitVibe grants you a limited, revocable, non-exclusive, non-transferable license to
                install and use the Services for personal or authorized organizational use in
                accordance with these Terms.
              </li>
              <li style={listItemStyle}>
                The Services and all related intellectual property are owned by FitVibe and its
                licensors. No rights are granted except as expressly stated.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>3. Acceptable use</h2>
            <p style={paragraphStyle}>You agree not to:</p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                Reverse engineer, modify, or create derivative works of the Services except as
                permitted by law.
              </li>
              <li style={listItemStyle}>
                Circumvent security measures, access non-public areas, or interfere with system
                integrity.
              </li>
              <li style={listItemStyle}>
                Upload unlawful, defamatory, or infringing content, or content that includes
                personal data of others without permission.
              </li>
              <li style={listItemStyle}>
                Use the Services to provide medical diagnosis or emergency response or to engage in
                harassment, discrimination, or abusive conduct.
              </li>
              <li style={listItemStyle}>
                Use automated means to access or extract data except through approved APIs and rate
                limits.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>4. User content</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                You retain ownership of content you submit (e.g., training logs, comments, media).
                You grant FitVibe a worldwide, royalty-free license to host, use, reproduce, modify,
                publish, and display that content solely to operate and improve the Services.
              </li>
              <li style={listItemStyle}>
                You represent that you have the rights to share content you submit and that it does
                not violate the rights of others or applicable law.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>5. Health and safety notice</h2>
            <p style={paragraphStyle}>
              FitVibe provides training and wellness tools and does not provide medical advice.
              Consult a physician before beginning new training programs. Stop using the Services
              and seek medical attention if you experience adverse symptoms.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>6. Third-party services and integrations</h2>
            <p style={paragraphStyle}>
              Some features rely on third-party services (e.g., analytics, payment processors,
              device integrations). Your use of those services may be subject to their terms.
              FitVibe is not responsible for third-party services.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>7. Fees and subscriptions</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                If subscription or paid features are offered, pricing and billing terms will be
                presented in the Services. Taxes may apply. Payments are processed by third-party
                processors; you authorize FitVibe and processors to charge applicable fees.
              </li>
              <li style={listItemStyle}>
                FitVibe may change pricing with reasonable notice, subject to applicable law. If you
                do not agree to changes, you may cancel before the new pricing takes effect.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>8. Termination</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                You may stop using the Services at any time. You may request account deletion as
                described in the Privacy Policy.
              </li>
              <li style={listItemStyle}>
                FitVibe may suspend or terminate access for breach of these Terms, legal
                requirements, or to protect the Services or users. We may provide notice where
                feasible.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>9. Disclaimers</h2>
            <p style={paragraphStyle}>
              The Services are provided "as is" and "as available" without warranties of any kind,
              express or implied, including merchantability, fitness for a particular purpose,
              non-infringement, and accuracy. Some jurisdictions do not allow exclusions of certain
              warranties, so these exclusions may not apply.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>10. Limitation of liability</h2>
            <p style={paragraphStyle}>
              To the fullest extent permitted by law, FitVibe will not be liable for indirect,
              incidental, special, consequential, or punitive damages, or for loss of profits, data,
              goodwill, or business interruption, even if advised of the possibility of such
              damages. FitVibe's total liability for claims arising out of or related to the
              Services will not exceed the greater of (a) amounts you paid to FitVibe for the
              Services in the twelve months before the claim or (b) USD $100, except where
              prohibited by law.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>11. Indemnification</h2>
            <p style={paragraphStyle}>
              You agree to indemnify and hold harmless FitVibe, its affiliates, and their officers,
              employees, and agents from any claims, damages, losses, or expenses arising from your
              use of the Services or breach of these Terms.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>12. Governing law and dispute resolution</h2>
            <p style={paragraphStyle}>
              These Terms are governed by the laws of the State of Delaware, USA, without regard to
              conflict of laws principles, except where mandatory local law applies. Disputes should
              first be raised with FitVibe support. Where permitted by law, disputes will be
              resolved through binding arbitration in Delaware on an individual basis, and you waive
              class actions. If arbitration is not permitted, disputes will be resolved in the
              courts located in Delaware. Consumers may have statutory rights to bring claims in
              their home jurisdictions; these Terms do not limit such rights.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>13. Export and sanctions compliance</h2>
            <p style={paragraphStyle}>
              You must comply with applicable export control and sanctions laws. You may not use the
              Services if you are located in, or are ordinarily resident in, countries embargoed by
              the U.S. or if you are on applicable sanctions lists.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>14. Changes to the Services and Terms</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                We may modify or discontinue features to improve performance, security, or
                compliance. We will provide notice of material changes where required.
              </li>
              <li style={listItemStyle}>
                Continued use after changes become effective constitutes acceptance. If you do not
                agree, stop using the Services.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>15. Notices</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>Notices to FitVibe: legal@fitvibe.example.com.</li>
              <li style={listItemStyle}>
                Notices to you: via email, in-product messages, or other reasonable means. You are
                responsible for keeping contact details current.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>16. Contact</h2>
            <p style={paragraphStyle}>
              Questions about these Terms can be sent to legal@fitvibe.example.com.
            </p>
          </section>
        </CardContent>
      </Card>
    </PageIntro>
  );
};

export default Terms;
