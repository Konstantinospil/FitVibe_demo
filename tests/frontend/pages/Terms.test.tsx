import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Terms from "../../src/pages/Terms";
import { ToastProvider } from "../../src/contexts/ToastContext";

const { authState, acceptTerms, revokeTerms, getLegalDocumentsStatus, mockNavigate } = vi.hoisted(
  () => ({
    authState: {
      isAuthenticated: false,
      signOut: vi.fn(),
    },
    acceptTerms: vi.fn(),
    revokeTerms: vi.fn(),
    getLegalDocumentsStatus: vi.fn(),
    mockNavigate: vi.fn(),
  }),
);

vi.mock("../../src/i18n/config", () => ({
  ensureLegalTranslationsLoaded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/store/auth.store", () => ({
  useAuthStore: vi.fn((selector: (state: typeof authState) => unknown) => selector(authState)),
}));

vi.mock("../../src/services/api", () => ({
  acceptTerms,
  revokeTerms,
  getLegalDocumentsStatus,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string, options?: { returnObjects?: boolean }) => {
      const translations: Record<string, string | string[] | Record<string, unknown>> = {
        "navigation.back": "Back",
        "terms.eyebrow": "Terms",
        "terms.title": "Terms and Conditions",
        "terms.description": "Terms of service",
        "terms.effectiveDate": "Effective Date",
        "terms.effectiveDateValue": "2024-06-01",
        "terms.intro":
          'These Terms and Conditions / End User License Agreement ("Terms") govern your access to and use of the FitVibe websites, mobile applications, APIs, and related services (collectively, the "Services"). By using the Services, you agree to these Terms and to the Privacy Policy and Cookie Policy.',
        "terms.section1.title": "1. Eligibility and account registration",
        "terms.section1.items": [
          "You must be at least 16 years old or the age required by your jurisdiction. If you are agreeing on behalf of an organization, you represent that you have authority to bind it.",
          "You are responsible for maintaining accurate account information and for safeguarding login credentials. Notify FitVibe immediately of unauthorized use.",
        ],
        "terms.section2.title": "2. License grant and intellectual property",
        "terms.section2.items": [
          "FitVibe grants you a limited, revocable, non-exclusive, non-transferable license to install and use the Services for personal or authorized organizational use in accordance with these Terms.",
          "The Services and all related intellectual property are owned by FitVibe and its licensors. No rights are granted except as expressly stated.",
        ],
        "terms.section3.title": "3. Acceptable use",
        "terms.section3.subtitle": "You agree not to:",
        "terms.section3.items": [
          "Reverse engineer, modify, or create derivative works of the Services except as permitted by law.",
          "Circumvent security measures, access non-public areas, or interfere with system integrity.",
          "Upload unlawful, defamatory, or infringing content, or content that includes personal data of others without permission.",
          "Use the Services to provide medical diagnosis or emergency response or to engage in harassment, discrimination, or abusive conduct.",
          "Use automated means to access or extract data except through approved APIs and rate limits.",
        ],
        "terms.section4.title": "4. User content",
        "terms.section4.items": [
          "You retain ownership of content you submit (e.g., training logs, comments, media). You grant FitVibe a worldwide, royalty-free license to host, use, reproduce, modify, publish, and display that content solely to operate and improve the Services.",
          "You represent that you have the rights to share content you submit and that it does not violate the rights of others or applicable law.",
        ],
        "terms.section5.title": "5. Health and safety notice",
        "terms.section5.content":
          "FitVibe provides training and wellness tools and does not provide medical advice. Consult a physician before beginning new training programs. Stop using the Services and seek medical attention if you experience adverse symptoms.",
        "terms.section6.title": "6. Third-party services and integrations",
        "terms.section6.content":
          "Some features rely on third-party services (e.g., analytics, payment processors, device integrations). Your use of those services may be subject to their terms. FitVibe is not responsible for third-party services.",
        "terms.section7.title": "7. Fees and subscriptions",
        "terms.section7.items": [
          "If subscription or paid features are offered, pricing and billing terms will be presented in the Services. Taxes may apply. Payments are processed by third-party processors; you authorize FitVibe and processors to charge applicable fees.",
          "FitVibe may change pricing with reasonable notice, subject to applicable law. If you do not agree to changes, you may cancel before the new pricing takes effect.",
        ],
        "terms.section8.title": "8. Termination",
        "terms.section8.items": [
          "You may stop using the Services at any time. You may request account deletion as described in the Privacy Policy.",
          "FitVibe may suspend or terminate access for breach of these Terms, legal requirements, or to protect the Services or users. We may provide notice where feasible.",
        ],
        "terms.section9.title": "9. Disclaimers",
        "terms.section9.content":
          'The Services are provided "as is" and "as available" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, non-infringement, and accuracy. Some jurisdictions do not allow exclusions of certain warranties, so these exclusions may not apply.',
        "terms.section10.title": "10. Limitation of liability",
        "terms.section10.content":
          "To the fullest extent permitted by law, FitVibe will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, goodwill, or business interruption, even if advised of the possibility of such damages. FitVibe's total liability for claims arising out of or related to the Services will not exceed the greater of (a) amounts you paid to FitVibe for the Services in the twelve months before the claim or (b) USD $100, except where prohibited by law.",
        "terms.section11.title": "11. Indemnification",
        "terms.section11.content":
          "You agree to indemnify and hold harmless FitVibe, its affiliates, and their officers, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Services or breach of these Terms.",
        "terms.section12.title": "12. Governing law and dispute resolution",
        "terms.section12.content":
          "These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of laws principles, except where mandatory local law applies. Disputes should first be raised with FitVibe support. Where permitted by law, disputes will be resolved through binding arbitration in Delaware on an individual basis, and you waive class actions. If arbitration is not permitted, disputes will be resolved in the courts located in Delaware. Consumers may have statutory rights to bring claims in their home jurisdictions; these Terms do not limit such rights.",
        "terms.section13.title": "13. Export and sanctions compliance",
        "terms.section13.content":
          "You must comply with applicable export control and sanctions laws. You may not use the Services if you are located in, or are ordinarily resident in, countries embargoed by the U.S. or if you are on applicable sanctions lists.",
        "terms.section14.title": "14. Changes to the Services and Terms",
        "terms.section14.items": [
          "We may modify or discontinue features to improve performance, security, or compliance. We will provide notice of material changes where required.",
          "Continued use after changes become effective constitutes acceptance. If you do not agree, stop using the Services.",
        ],
        "terms.section15.title": "15. Notices",
        "terms.section15.items": [
          "Notices to FitVibe: legal@fitvibe.example.com.",
          "Notices to you: via email, in-product messages, or other reasonable means. You are responsible for keeping contact details current.",
        ],
        "terms.section16.title": "16. Contact",
        "terms.section16.content":
          "Questions about these Terms can be sent to legal@fitvibe.example.com.",
        "terms.consent.accept": "Accept Terms and Conditions",
        "terms.consent.accepting": "Accepting…",
        "terms.consent.acceptError": "Failed to accept the Terms and Conditions. Please try again.",
        "terms.consent.revoke": "Revoke consent",
        "terms.consent.revokeError":
          "Failed to revoke Terms and Conditions consent. Please try again.",
        "terms.consent.revokeConfirm.title": "Revoke Terms consent?",
        "terms.consent.revokeConfirm.message":
          "Revoking your consent means you will no longer be able to use FitVibe.",
        "terms.consent.revokeConfirm.confirm": "Revoke consent and log out",
        "terms.consent.revokeConfirm.cancel": "Back",
      };
      const value = translations[key];
      if (options?.returnObjects && value && typeof value === "object" && !Array.isArray(value)) {
        return value;
      }
      if (options?.returnObjects && Array.isArray(value)) {
        return value;
      }
      return typeof value === "string" ? value : key;
    },
  }),
}));

const renderTerms = () =>
  render(
    <ToastProvider>
      <MemoryRouter>
        <Terms />
      </MemoryRouter>
    </ToastProvider>,
  );

describe("Terms page", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.signOut = vi.fn();
    acceptTerms.mockReset().mockResolvedValue({ message: "ok" });
    revokeTerms.mockReset().mockResolvedValue({ message: "ok" });
    getLegalDocumentsStatus.mockReset();
    mockNavigate.mockReset();
  });

  it("should render terms and conditions content", () => {
    renderTerms();

    expect(screen.getByText("Terms and Conditions")).toBeInTheDocument();
    expect(screen.getByText("Terms of service")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("should display effective date", () => {
    renderTerms();

    expect(screen.getByText(/Effective Date/i)).toBeInTheDocument();
    expect(screen.getByText(/2024-06-01/i)).toBeInTheDocument();
  });

  it("should render terms sections", () => {
    renderTerms();

    expect(screen.getByText("1. Eligibility and account registration")).toBeInTheDocument();
    expect(screen.getByText("2. License grant and intellectual property")).toBeInTheDocument();
    expect(screen.getByText("3. Acceptable use")).toBeInTheDocument();
  });

  it("should render health and safety notice", () => {
    renderTerms();

    expect(screen.getByText("5. Health and safety notice")).toBeInTheDocument();
  });

  it("should render contact information", () => {
    renderTerms();

    const emailElements = screen.getAllByText(/legal@fitvibe.example.com/i);
    expect(emailElements.length).toBeGreaterThan(0);
  });

  it("should accept terms when the authenticated user has not accepted yet", async () => {
    authState.isAuthenticated = true;
    getLegalDocumentsStatus.mockResolvedValue({
      terms: {
        accepted: false,
        acceptedAt: null,
        acceptedVersion: null,
        currentVersion: "1.0.0",
        needsAcceptance: true,
      },
    });

    renderTerms();

    const acceptButton = await screen.findByRole("button", { name: "Accept Terms and Conditions" });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(acceptTerms).toHaveBeenCalledWith({ terms_accepted: true });
    });
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("should revoke terms consent and sign the user out", async () => {
    authState.isAuthenticated = true;
    getLegalDocumentsStatus.mockResolvedValue({
      terms: {
        accepted: true,
        acceptedAt: "2024-06-01T00:00:00.000Z",
        acceptedVersion: "1.0.0",
        currentVersion: "1.0.0",
        needsAcceptance: false,
      },
    });

    renderTerms();

    const revokeButton = await screen.findByRole("button", { name: "Revoke consent" });
    fireEvent.click(revokeButton);

    const confirmButton = await screen.findByRole("button", { name: "Revoke consent and log out" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(revokeTerms).toHaveBeenCalled();
    });
    expect(authState.signOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });
});
