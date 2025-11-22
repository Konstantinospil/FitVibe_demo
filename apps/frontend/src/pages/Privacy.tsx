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

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: "1rem",
};

const tableHeaderStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.75rem",
  borderBottom: "1px solid var(--color-border)",
  fontWeight: 600,
  color: "var(--color-text-primary)",
};

const tableCellStyle: React.CSSProperties = {
  padding: "0.75rem",
  borderBottom: "1px solid var(--color-border)",
  color: "var(--color-text-secondary)",
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
        <CardContent style={contentStyle}>
          <div
            style={{ marginBottom: "1rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}
          >
            <strong>{t("privacy.effectiveDate")}:</strong> 26 October 2025
          </div>

          <p style={paragraphStyle}>
            FitVibe helps athletes and active individuals plan training sessions, log workouts, and
            understand their progress. This Privacy Policy explains what personal data we collect
            when you use the Services, why we collect it, how we use and share it, and the rights
            available to you under the General Data Protection Regulation ("GDPR"), the UK GDPR, and
            other applicable data protection laws.
          </p>

          <p style={paragraphStyle}>
            By using the Services, you acknowledge that your personal data will be processed as
            described in this Privacy Policy.
          </p>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>1. Scope</h2>
            <p style={paragraphStyle}>This Privacy Policy:</p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                Applies to anyone who visits our sites or apps, creates an account, uses the
                Services, participates in communities, or otherwise interacts with FitVibe.
              </li>
              <li style={listItemStyle}>
                Covers all personal data processed by FitVibe acting as <strong>controller</strong>.
                When we process data strictly on behalf of organizations (for example, a club or
                employer using FitVibe for their members), those organizations are controllers and
                we act as <strong>processor</strong> in accordance with our data processing
                agreements.
              </li>
              <li style={listItemStyle}>
                Does <strong>not</strong> apply to third‑party services, websites, or devices that
                you choose to connect to FitVibe; their privacy practices are governed by their own
                policies.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>2. Who we are and how to contact us</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Controller:</strong> FitVibe
              </li>
              <li style={listItemStyle}>
                <strong>Data protection and privacy inquiries:</strong> kpilpilidis@gmail.com
              </li>
              <li style={listItemStyle}>
                <strong>Data Protection Officer (where required):</strong> kpilpilidis@gmail.com
              </li>
              <li style={listItemStyle}>
                <strong>EU/UK representative (if appointed):</strong> details will be published in
                localized supplements to this notice.
              </li>
            </ul>
            <p style={paragraphStyle}>
              You may contact us at these addresses for any questions about this Policy or our
              handling of your personal data.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>3. Information we collect</h2>
            <p style={paragraphStyle}>
              We group the personal data we process into the following categories.
            </p>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Category</th>
                  <th style={tableHeaderStyle}>Examples</th>
                  <th style={tableHeaderStyle}>Source</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tableCellStyle}>Account data</td>
                  <td style={tableCellStyle}>
                    Email address, username, password hash, account identifiers
                  </td>
                  <td style={tableCellStyle}>Provided by you</td>
                </tr>
                <tr>
                  <td style={tableCellStyle}>Profile & preferences</td>
                  <td style={tableCellStyle}>
                    Display name, avatar, locale, time zone, units (kg/lb, km/mi), language,
                    visibility settings, contact preferences
                  </td>
                  <td style={tableCellStyle}>Provided by you</td>
                </tr>
                <tr>
                  <td style={tableCellStyle}>Training & wellness data</td>
                  <td style={tableCellStyle}>
                    Workout logs, exercises performed, sets/reps, loads, pace, heart‑rate or power
                    data (if connected), RPE, body measurements, wellness check‑ins
                  </td>
                  <td style={tableCellStyle}>Provided by you or via integrations you connect</td>
                </tr>
                <tr>
                  <td style={tableCellStyle}>Social & community content</td>
                  <td style={tableCellStyle}>
                    Comments, likes, messages, profile information visible to others, participation
                    in teams or groups
                  </td>
                  <td style={tableCellStyle}>Provided by you</td>
                </tr>
                <tr>
                  <td style={tableCellStyle}>Device & technical data</td>
                  <td style={tableCellStyle}>
                    IP address, device identifiers, operating system, app version, browser type,
                    language, time zone
                  </td>
                  <td style={tableCellStyle}>Collected automatically</td>
                </tr>
                <tr>
                  <td style={tableCellStyle}>Usage and diagnostics data</td>
                  <td style={tableCellStyle}>
                    Feature usage, clickstream and navigation data, performance metrics, crash
                    reports, error logs
                  </td>
                  <td style={tableCellStyle}>Collected automatically</td>
                </tr>
                <tr>
                  <td style={tableCellStyle}>Support & communication data</td>
                  <td style={tableCellStyle}>
                    Messages you send to support, feedback, survey responses, and related metadata
                  </td>
                  <td style={tableCellStyle}>Provided by you</td>
                </tr>
                <tr>
                  <td style={tableCellStyle}>Payment and billing data</td>
                  <td style={tableCellStyle}>
                    Limited billing details such as billing address, transaction IDs (full card data
                    is handled by our payment processor)
                  </td>
                  <td style={tableCellStyle}>Provided by you / payment provider</td>
                </tr>
                <tr>
                  <td style={tableCellStyle}>Cookies and similar IDs</td>
                  <td style={tableCellStyle}>
                    Cookie identifiers, mobile advertising IDs, and similar technology used for
                    analytics and, where permitted, marketing
                  </td>
                  <td style={tableCellStyle}>Collected automatically</td>
                </tr>
              </tbody>
            </table>
            <p style={paragraphStyle}>
              We do <strong>not</strong> intend to collect special categories of data (such as
              medical diagnoses) unless clearly necessary for a feature and permitted by law. Where
              applicable, we will seek your explicit consent.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>4. Sources of information</h2>
            <p style={paragraphStyle}>We obtain personal data from:</p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>You</strong>, when you create an account, update your profile, log workouts,
                participate in social features, or contact support.
              </li>
              <li style={listItemStyle}>
                <strong>Your devices and browsers</strong>, through cookies, SDKs, and similar
                technologies.
              </li>
              <li style={listItemStyle}>
                <strong>Organizations</strong> (such as clubs or employers) that provision accounts
                or integrate FitVibe with their internal systems.
              </li>
              <li style={listItemStyle}>
                <strong>Third‑party services</strong> (for example, wearables or calendar providers)
                that you connect to FitVibe, strictly according to your permissions.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>5. How we use your information</h2>
            <p style={paragraphStyle}>We use the personal data described above to:</p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                Provide, operate, and maintain the Services, including planning tools, training
                logs, and analytics dashboards.
              </li>
              <li style={listItemStyle}>
                Personalize your experience, for example by adapting units, language, and suggested
                content to your profile.
              </li>
              <li style={listItemStyle}>
                Generate training summaries, trends, and insights across your historical data.
              </li>
              <li style={listItemStyle}>
                Authenticate you, secure accounts, detect and prevent fraud and abuse, and protect
                the integrity of the platform.
              </li>
              <li style={listItemStyle}>
                Operate social and community features such as following, comments, leaderboards, and
                shared plans, where you choose to use them.
              </li>
              <li style={listItemStyle}>
                Communicate with you about service updates, security notices, and administrative
                messages. Marketing communications are sent only where permitted by law and
                according to your preferences.
              </li>
              <li style={listItemStyle}>
                Conduct analytics to understand usage, improve performance, and plan new features,
                using aggregated or de‑identified data where possible.
              </li>
              <li style={listItemStyle}>
                Comply with legal obligations, enforce our Terms and Conditions/EULA, and protect
                FitVibe, our users, and the public from harm.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>
              6. Legal bases for processing (EEA, UK, and similar jurisdictions)
            </h2>
            <p style={paragraphStyle}>
              Where the GDPR, UK GDPR, or comparable laws apply, we rely on one or more of the
              following legal bases:
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Performance of a contract:</strong> To create and manage your account,
                provide the Services you request, and support your use of FitVibe.
              </li>
              <li style={listItemStyle}>
                <strong>Consent:</strong> For example, when you opt‑in to marketing emails or push
                notifications, you make certain content publicly visible, or you connect third‑party
                integrations or enable optional analytics and cookies where required by law. You may
                withdraw consent at any time, without affecting the lawfulness of processing before
                withdrawal.
              </li>
              <li style={listItemStyle}>
                <strong>Legitimate interests:</strong> To maintain and improve the security,
                performance, and usability of the Services; to prevent abuse; and to understand how
                the Services are used, provided that these interests are balanced against your
                rights and freedoms.
              </li>
              <li style={listItemStyle}>
                <strong>Legal obligations:</strong> To comply with accounting, tax, and regulatory
                requirements and to respond to lawful requests from public authorities.
              </li>
              <li style={listItemStyle}>
                <strong>Vital interests or public interest:</strong> In rare cases, to protect life
                or physical safety or to comply with public health directives, where permitted by
                law.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>7. Cookies and similar technologies</h2>
            <p style={paragraphStyle}>We use cookies and similar technologies to:</p>
            <ul style={listStyle}>
              <li style={listItemStyle}>keep you signed in and maintain session security;</li>
              <li style={listItemStyle}>remember your preferences (such as language and units);</li>
              <li style={listItemStyle}>measure usage and performance of the Services; and</li>
              <li style={listItemStyle}>
                support, where permitted, marketing and product development.
              </li>
            </ul>
            <p style={paragraphStyle}>
              Where required by law, we will present you with a cookie banner or settings to obtain
              your consent for non‑essential cookies and allow you to manage your preferences. For
              more information, please refer to our Cookie Policy (if available in your region).
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>8. How we share information</h2>
            <p style={paragraphStyle}>
              We do <strong>not</strong> sell your personal data.
            </p>
            <p style={paragraphStyle}>We may share your personal data with:</p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Service providers and sub‑processors</strong> — For example, providers of
                cloud infrastructure, email/SMS delivery, analytics, error reporting, and customer
                support tools. Each provider is bound by a data processing agreement requiring
                confidentiality, appropriate security measures, and, where applicable, Standard
                Contractual Clauses ("SCCs").
              </li>
              <li style={listItemStyle}>
                <strong>Integrations and partners you choose</strong> — For example, if you connect
                a wearable device or calendar provider, we share only the data needed to enable that
                integration and only according to your configuration and the partner's terms.
              </li>
              <li style={listItemStyle}>
                <strong>Organizations that provision your account</strong> — If your account is
                created or managed by a coach, club, or employer, certain profile and activity data
                may be visible to designated administrators in accordance with their policies and
                our contracts with them.
              </li>
              <li style={listItemStyle}>
                <strong>Business transfers</strong> — In connection with a merger, acquisition,
                reorganization, or sale of assets, where your data may be transferred as part of the
                transaction, subject to confidentiality and, where required, notice to you.
              </li>
              <li style={listItemStyle}>
                <strong>Legal and safety</strong> — When necessary to comply with legal obligations,
                court orders, or lawful requests, or to enforce our terms and protect the rights,
                property, and safety of FitVibe, our users, or the public.
              </li>
              <li style={listItemStyle}>
                <strong>Aggregated or de‑identified data</strong> — We may use or share aggregated
                or de‑identified information for analytics, research, or product improvement,
                provided it does not identify any individual.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>9. International data transfers</h2>
            <p style={paragraphStyle}>
              FitVibe may process and store your personal data in countries other than the one in
              which you reside. These countries may have data protection laws that differ from those
              in your jurisdiction.
            </p>
            <p style={paragraphStyle}>
              Where we transfer personal data from the EEA, UK, or Switzerland to countries that are
              not recognized as providing an adequate level of protection, we implement appropriate
              safeguards, such as:
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                Standard Contractual Clauses approved by the European Commission or UK authorities,
                and
              </li>
              <li style={listItemStyle}>
                additional technical and organizational measures based on transfer impact
                assessments, where required.
              </li>
            </ul>
            <p style={paragraphStyle}>
              You may request more information about these safeguards by contacting
              privacy@fitvibe.example.com.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>10. Data retention</h2>
            <p style={paragraphStyle}>
              We retain personal data only for as long as reasonably necessary to provide the
              Services and features you have requested, fulfil the purposes described in this
              Policy, comply with our legal and contractual obligations, and resolve disputes and
              enforce our agreements.
            </p>
            <p style={paragraphStyle}>In particular, subject to change as our services evolve:</p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Account, training, and social graph data</strong> are kept while your
                account remains active. When you request deletion of your account, we apply a short
                grace period (typically 7 days) and then delete or irreversibly anonymize associated
                data.
              </li>
              <li style={listItemStyle}>
                <strong>Backups</strong> containing personal data are rotated and purged within a
                limited window (typically 14 days after the effective deletion), using an automated
                process designed to support data subject rights.
              </li>
              <li style={listItemStyle}>
                <strong>Authentication tokens, idempotency records, and moderation queues</strong>{" "}
                are pruned on rolling schedules (for example, between 24 hours and 180 days),
                depending on operational needs and security requirements.
              </li>
              <li style={listItemStyle}>
                <strong>Audit logs and security logs</strong> are retained for a bounded period (for
                example, 180 days) to support incident response and compliance.
              </li>
            </ul>
            <p style={paragraphStyle}>
              When data is no longer required for these purposes, we either securely delete it or
              de‑identify it so that it can no longer be linked to you.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>11. Security</h2>
            <p style={paragraphStyle}>
              We implement appropriate technical and organizational measures to protect personal
              data, including:
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                TLS (HTTPS) encryption in transit, with modern protocols and strict transport
                security;
              </li>
              <li style={listItemStyle}>
                access controls and role‑based permissions in production environments, with
                multi‑factor authentication and use of a secrets manager;
              </li>
              <li style={listItemStyle}>
                regular security updates, vulnerability management, and monitoring for anomalies;
              </li>
              <li style={listItemStyle}>
                malware scanning for uploads, and audit trails for key administrative and
                security‑relevant actions.
              </li>
            </ul>
            <p style={paragraphStyle}>
              No system can be completely secure. You remain responsible for choosing strong
              passwords, keeping them confidential, enabling multi‑factor authentication where
              available, and promptly notifying us of any suspected unauthorized access to your
              account.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>12. Your rights</h2>
            <p style={paragraphStyle}>
              Depending on your place of residence and applicable law, you may have some or all of
              the following rights:
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Access</strong> – to obtain confirmation as to whether we process your
                personal data and receive a copy of that data.
              </li>
              <li style={listItemStyle}>
                <strong>Rectification</strong> – to have inaccurate or incomplete personal data
                corrected.
              </li>
              <li style={listItemStyle}>
                <strong>Erasure</strong> – to request deletion of your personal data, subject to
                certain exceptions (for example, where retention is required by law).
              </li>
              <li style={listItemStyle}>
                <strong>Restriction</strong> – to request that we restrict processing of your
                personal data in certain circumstances.
              </li>
              <li style={listItemStyle}>
                <strong>Objection</strong> – to object to processing based on legitimate interests
                and, where applicable, to object to direct marketing at any time.
              </li>
              <li style={listItemStyle}>
                <strong>Data portability</strong> – to receive your personal data in a structured,
                commonly used, and machine‑readable format and to transmit it to another controller
                where technically feasible.
              </li>
              <li style={listItemStyle}>
                <strong>Withdrawal of consent</strong> – where processing is based on consent, you
                may withdraw it at any time without affecting the lawfulness of processing before
                withdrawal.
              </li>
              <li style={listItemStyle}>
                <strong>Complaint to a supervisory authority</strong> – you may lodge a complaint
                with your local data protection authority if you believe our processing infringes
                applicable law.
              </li>
            </ul>
            <p style={paragraphStyle}>
              Residents of certain jurisdictions (for example, some U.S. states, Brazil, Canada) may
              have additional rights, such as rights to know, delete, or limit the use or disclosure
              of certain categories of information. These will be honored in accordance with the
              relevant statute.
            </p>
            <p style={paragraphStyle}>
              You can exercise these rights by using any self‑service tools provided in the app or
              account settings (for example, download or delete account functions), and/or
              contacting us at privacy@fitvibe.example.com.
            </p>
            <p style={paragraphStyle}>
              We may need to verify your identity before acting on your request and may decline
              requests that are manifestly unfounded, excessive, or otherwise not required or
              permitted by law.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>13. Children's data</h2>
            <p style={paragraphStyle}>
              The Services are <strong>not directed to children under 16</strong>, or any higher age
              set by applicable law in your jurisdiction for online consent.
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                We do not knowingly collect personal data from children under the applicable minimum
                age.
              </li>
              <li style={listItemStyle}>
                If we learn that we have collected personal data from such a child without
                appropriate consent, we will delete it as soon as reasonably possible.
              </li>
            </ul>
            <p style={paragraphStyle}>
              If you believe that a child has provided personal data to FitVibe in breach of this
              Policy, please contact us at privacy@fitvibe.example.com.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>14. Health and fitness considerations</h2>
            <p style={paragraphStyle}>
              FitVibe provides training and wellness tooling. It is <strong>not</strong> a medical
              device and is <strong>not</strong> intended to diagnose, treat, cure, or prevent any
              disease.
            </p>
            <p style={paragraphStyle}>
              Nothing in the Services constitutes medical advice. You should consult qualified
              healthcare professionals before starting or modifying any training program, especially
              if you have existing health conditions.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>15. Changes to this Policy</h2>
            <p style={paragraphStyle}>
              We may update this Privacy Policy from time to time, for example when we introduce new
              features, use new providers, or when laws or regulatory guidance change.
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                The "Effective date" at the top of this Policy indicates when it last changed.
              </li>
              <li style={listItemStyle}>
                For material changes, we will provide additional notice, such as an in‑app
                notification or email.
              </li>
              <li style={listItemStyle}>
                The Policy is maintained in version control with historical versions retained for
                reference.
              </li>
            </ul>
            <p style={paragraphStyle}>
              Your continued use of the Services after changes take effect constitutes your
              acknowledgment of the updated Policy.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>16. How to contact us or exercise your rights</h2>
            <p style={paragraphStyle}>
              If you have questions about this Privacy Policy, our use of your personal data, or if
              you wish to exercise your rights, please contact:
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Email:</strong> kpilpilidis@gmail.com
              </li>
              <li style={listItemStyle}>
                <strong>(Where applicable) Data Protection Officer:</strong> kpilpilidis@gmail.com
              </li>
            </ul>
            <p style={paragraphStyle}>
              We will respond without undue delay and within the time limits required by applicable
              data protection law (for example, one month under the GDPR, subject to permitted
              extensions for complex requests).
            </p>
          </section>
        </CardContent>
      </Card>
    </PageIntro>
  );
};

export default Privacy;
