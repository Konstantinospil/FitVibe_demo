/**
 * Simple i18n service for backend email templates
 * Supports multiple languages with fallback to English
 */

type SupportedLanguage = "en" | "de" | "es" | "fr" | "el";

interface EmailTranslations {
  verification: {
    subject: string;
    welcome: string;
    verifyButton: string;
    orCopy: string;
    expiresIn: string;
    minutes: string;
  };
  resend: {
    subject: string;
    title: string;
    message: string;
    verifyButton: string;
    orCopy: string;
    expiresIn: string;
    minutes: string;
  };
}

const translations: Record<SupportedLanguage, EmailTranslations> = {
  en: {
    verification: {
      subject: "Verify your FitVibe account",
      welcome: "Welcome to FitVibe!",
      verifyButton: "Verify Email Address",
      orCopy: "Or copy and paste this link into your browser:",
      expiresIn: "This link will expire in",
      minutes: "minutes",
    },
    resend: {
      subject: "Verify your FitVibe account",
      title: "Verify your FitVibe account",
      message:
        "We received a request to resend your verification email. Please verify your email address by clicking the link below:",
      verifyButton: "Verify Email Address",
      orCopy: "Or copy and paste this link into your browser:",
      expiresIn: "This link will expire in",
      minutes: "minutes",
    },
  },
  de: {
    verification: {
      subject: "Bestätigen Sie Ihr FitVibe-Konto",
      welcome: "Willkommen bei FitVibe!",
      verifyButton: "E-Mail-Adresse bestätigen",
      orCopy: "Oder kopieren Sie diesen Link in Ihren Browser:",
      expiresIn: "Dieser Link läuft ab in",
      minutes: "Minuten",
    },
    resend: {
      subject: "Bestätigen Sie Ihr FitVibe-Konto",
      title: "Bestätigen Sie Ihr FitVibe-Konto",
      message:
        "Wir haben eine Anfrage erhalten, Ihre Bestätigungs-E-Mail erneut zu senden. Bitte bestätigen Sie Ihre E-Mail-Adresse, indem Sie auf den untenstehenden Link klicken:",
      verifyButton: "E-Mail-Adresse bestätigen",
      orCopy: "Oder kopieren Sie diesen Link in Ihren Browser:",
      expiresIn: "Dieser Link läuft ab in",
      minutes: "Minuten",
    },
  },
  es: {
    verification: {
      subject: "Verifica tu cuenta de FitVibe",
      welcome: "¡Bienvenido a FitVibe!",
      verifyButton: "Verificar dirección de correo",
      orCopy: "O copia y pega este enlace en tu navegador:",
      expiresIn: "Este enlace expirará en",
      minutes: "minutos",
    },
    resend: {
      subject: "Verifica tu cuenta de FitVibe",
      title: "Verifica tu cuenta de FitVibe",
      message:
        "Recibimos una solicitud para reenviar tu correo de verificación. Por favor, verifica tu dirección de correo haciendo clic en el enlace a continuación:",
      verifyButton: "Verificar dirección de correo",
      orCopy: "O copia y pega este enlace en tu navegador:",
      expiresIn: "Este enlace expirará en",
      minutes: "minutos",
    },
  },
  fr: {
    verification: {
      subject: "Vérifiez votre compte FitVibe",
      welcome: "Bienvenue sur FitVibe !",
      verifyButton: "Vérifier l'adresse e-mail",
      orCopy: "Ou copiez et collez ce lien dans votre navigateur :",
      expiresIn: "Ce lien expirera dans",
      minutes: "minutes",
    },
    resend: {
      subject: "Vérifiez votre compte FitVibe",
      title: "Vérifiez votre compte FitVibe",
      message:
        "Nous avons reçu une demande de renvoi de votre e-mail de vérification. Veuillez vérifier votre adresse e-mail en cliquant sur le lien ci-dessous :",
      verifyButton: "Vérifier l'adresse e-mail",
      orCopy: "Ou copiez et collez ce lien dans votre navigateur :",
      expiresIn: "Ce lien expirera dans",
      minutes: "minutes",
    },
  },
  el: {
    verification: {
      subject: "Επαληθεύστε τον λογαριασμό σας στο FitVibe",
      welcome: "Καλώς ήρθατε στο FitVibe!",
      verifyButton: "Επαλήθευση διεύθυνσης email",
      orCopy: "Ή αντιγράψτε και επικολλήστε αυτόν τον σύνδεσμο στον περιηγητή σας:",
      expiresIn: "Αυτός ο σύνδεσμος θα λήξει σε",
      minutes: "λεπτά",
    },
    resend: {
      subject: "Επαληθεύστε τον λογαριασμό σας στο FitVibe",
      title: "Επαληθεύστε τον λογαριασμό σας στο FitVibe",
      message:
        "Λάβαμε αίτημα για επαναποστολή του email επαλήθευσης. Παρακαλώ επαληθεύστε τη διεύθυνση email σας κάνοντας κλικ στον παρακάτω σύνδεσμο:",
      verifyButton: "Επαλήθευση διεύθυνσης email",
      orCopy: "Ή αντιγράψτε και επικολλήστε αυτόν τον σύνδεσμο στον περιηγητή σας:",
      expiresIn: "Αυτός ο σύνδεσμος θα λήξει σε",
      minutes: "λεπτά",
    },
  },
};

/**
 * Get email translations for a given language
 * Falls back to English if language is not supported
 */
export function getEmailTranslations(lang?: string | null): EmailTranslations {
  const normalizedLang = lang?.toLowerCase().split("-")[0] as SupportedLanguage | undefined;
  return translations[normalizedLang || "en"] || translations.en;
}

/**
 * Generate verification email HTML template
 */
export function generateVerificationEmailHtml(
  verificationUrl: string,
  expiresInMinutes: number,
  lang?: string | null,
): string {
  const t = getEmailTranslations(lang);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${t.verification.welcome}</h2>
      <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
      <p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
          ${t.verification.verifyButton}
        </a>
      </p>
      <p>${t.verification.orCopy}</p>
      <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
      <p style="color: #999; font-size: 12px; margin-top: 32px;">
        ${t.verification.expiresIn} ${expiresInMinutes} ${t.verification.minutes}.
      </p>
    </div>
  `;
}

/**
 * Generate verification email text template
 */
export function generateVerificationEmailText(
  verificationUrl: string,
  expiresInMinutes: number,
  lang?: string | null,
): string {
  const t = getEmailTranslations(lang);
  return `${t.verification.welcome} Please verify your email address by visiting: ${verificationUrl}\n\n${t.verification.expiresIn} ${expiresInMinutes} ${t.verification.minutes}.`;
}

/**
 * Generate resend verification email HTML template
 */
export function generateResendVerificationEmailHtml(
  verificationUrl: string,
  expiresInMinutes: number,
  lang?: string | null,
): string {
  const t = getEmailTranslations(lang);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${t.resend.title}</h2>
      <p>${t.resend.message}</p>
      <p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
          ${t.resend.verifyButton}
        </a>
      </p>
      <p>${t.resend.orCopy}</p>
      <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
      <p style="color: #999; font-size: 12px; margin-top: 32px;">
        ${t.resend.expiresIn} ${expiresInMinutes} ${t.resend.minutes}.
      </p>
    </div>
  `;
}

/**
 * Generate resend verification email text template
 */
export function generateResendVerificationEmailText(
  verificationUrl: string,
  expiresInMinutes: number,
  lang?: string | null,
): string {
  const t = getEmailTranslations(lang);
  return `${t.resend.title} ${t.resend.message} ${verificationUrl}\n\n${t.resend.expiresIn} ${expiresInMinutes} ${t.resend.minutes}.`;
}
