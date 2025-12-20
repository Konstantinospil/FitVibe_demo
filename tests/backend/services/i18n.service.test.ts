import {
  getEmailTranslations,
  generateVerificationEmailHtml,
  generateVerificationEmailText,
  generateResendVerificationEmailHtml,
  generateResendVerificationEmailText,
} from "../../../apps/backend/src/services/i18n.service.js";

describe("i18n Service", () => {
  describe("getEmailTranslations", () => {
    it("should return English translations by default", () => {
      const translations = getEmailTranslations();

      expect(translations).toHaveProperty("verification");
      expect(translations).toHaveProperty("resend");
      expect(translations.verification.subject).toBe("Verify your FitVibe account");
    });

    it("should return English translations for null", () => {
      const translations = getEmailTranslations(null);

      expect(translations.verification.subject).toBe("Verify your FitVibe account");
    });

    it("should return English translations for undefined", () => {
      const translations = getEmailTranslations(undefined);

      expect(translations.verification.subject).toBe("Verify your FitVibe account");
    });

    it("should return English translations for unsupported language", () => {
      const translations = getEmailTranslations("ja");

      expect(translations.verification.subject).toBe("Verify your FitVibe account");
    });

    it("should return German translations", () => {
      const translations = getEmailTranslations("de");

      expect(translations.verification.subject).toBe("Bestätigen Sie Ihr FitVibe-Konto");
      expect(translations.verification.welcome).toBe("Willkommen bei FitVibe!");
    });

    it("should return Spanish translations", () => {
      const translations = getEmailTranslations("es");

      expect(translations.verification.subject).toBe("Verifica tu cuenta de FitVibe");
      expect(translations.verification.welcome).toBe("¡Bienvenido a FitVibe!");
    });

    it("should return French translations", () => {
      const translations = getEmailTranslations("fr");

      expect(translations.verification.subject).toBe("Vérifiez votre compte FitVibe");
      expect(translations.verification.welcome).toBe("Bienvenue sur FitVibe !");
    });

    it("should return Greek translations", () => {
      const translations = getEmailTranslations("el");

      expect(translations.verification.subject).toBe("Επαληθεύστε τον λογαριασμό σας στο FitVibe");
      expect(translations.verification.welcome).toBe("Καλώς ήρθατε στο FitVibe!");
    });

    it("should handle language codes with region", () => {
      const translations = getEmailTranslations("en-US");

      expect(translations.verification.subject).toBe("Verify your FitVibe account");
    });

    it("should handle case-insensitive language codes", () => {
      const translations = getEmailTranslations("DE");

      expect(translations.verification.subject).toBe("Bestätigen Sie Ihr FitVibe-Konto");
    });
  });

  describe("generateVerificationEmailHtml", () => {
    it("should generate HTML email with verification URL", () => {
      const url = "https://example.com/verify?token=abc123";
      const html = generateVerificationEmailHtml(url, 60);

      expect(html).toContain(url);
      expect(html).toContain("60");
      expect(html).toContain("minutes");
      expect(html).toContain("Verify Email Address");
    });

    it("should use language-specific translations", () => {
      const url = "https://example.com/verify?token=abc123";
      const html = generateVerificationEmailHtml(url, 30, "de");

      expect(html).toContain("Willkommen bei FitVibe!");
      expect(html).toContain("E-Mail-Adresse bestätigen");
      expect(html).toContain("Minuten");
    });
  });

  describe("generateVerificationEmailText", () => {
    it("should generate text email with verification URL", () => {
      const url = "https://example.com/verify?token=abc123";
      const text = generateVerificationEmailText(url, 60);

      expect(text).toContain(url);
      expect(text).toContain("60");
      expect(text).toContain("minutes");
    });

    it("should use language-specific translations", () => {
      const url = "https://example.com/verify?token=abc123";
      const text = generateVerificationEmailText(url, 30, "es");

      expect(text).toContain("¡Bienvenido a FitVibe!");
      expect(text).toContain("minutos");
    });
  });

  describe("generateResendVerificationEmailHtml", () => {
    it("should generate HTML email for resend verification", () => {
      const url = "https://example.com/verify?token=abc123";
      const html = generateResendVerificationEmailHtml(url, 60);

      expect(html).toContain(url);
      expect(html).toContain("60");
      expect(html).toContain("minutes");
      expect(html).toContain("Verify your FitVibe account");
    });

    it("should use language-specific translations", () => {
      const url = "https://example.com/verify?token=abc123";
      const html = generateResendVerificationEmailHtml(url, 30, "fr");

      expect(html).toContain("Vérifiez votre compte FitVibe");
      expect(html).toContain("Vérifier l'adresse e-mail");
    });
  });

  describe("generateResendVerificationEmailText", () => {
    it("should generate text email for resend verification", () => {
      const url = "https://example.com/verify?token=abc123";
      const text = generateResendVerificationEmailText(url, 60);

      expect(text).toContain(url);
      expect(text).toContain("60");
      expect(text).toContain("minutes");
    });

    it("should use language-specific translations", () => {
      const url = "https://example.com/verify?token=abc123";
      const text = generateResendVerificationEmailText(url, 30, "el");

      expect(text).toContain("Επαληθεύστε τον λογαριασμό σας στο FitVibe");
      expect(text).toContain("λεπτά");
    });
  });
});
