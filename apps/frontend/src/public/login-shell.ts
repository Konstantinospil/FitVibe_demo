type LoginResponse =
  | {
      requires2FA: false;
      user: unknown;
      session: unknown;
    }
  | {
      requires2FA: true;
      pendingSessionId: string;
    };

type SupportedLanguage = string;

type AuthTranslations = {
  auth: {
    login: {
      eyebrow: string;
      title: string;
      description: string;
      emailLabel: string;
      passwordLabel: string;
      submit: string;
      submitting: string;
      registerPrompt: string;
      forgot: string;
      error: string;
      fillAllFields: string;
    };
    placeholders: {
      email: string;
      password: string;
    };
    showPassword: string;
    hidePassword: string;
  };
};

const DEFAULT_LANGUAGE = "en";

const form = document.getElementById("login-form") as HTMLFormElement | null;
const shell = document.getElementById("login-shell");
const AUTH_STORAGE_KEY = "fitvibe:auth";
const shouldUseShell = Boolean(form && shell);
const DEFAULT_TOGGLE_LABELS = {
  show: "Show password",
  hide: "Hide password",
};

const authLoaders: Record<string, () => Promise<{ default: AuthTranslations }>> = {
  en: () => import("../i18n/locales/en/auth.json"),
  de: () => import("../i18n/locales/de/auth.json"),
  fr: () => import("../i18n/locales/fr/auth.json"),
  es: () => import("../i18n/locales/es/auth.json"),
  el: () => import("../i18n/locales/el/auth.json"),
};

const getSupportedLanguages = async (): Promise<SupportedLanguage[]> => {
  try {
    const response = await fetch("/api/v1/translations/metadata", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Failed to load metadata");
    }
    const data = (await response.json()) as { data?: { languages?: SupportedLanguage[] } };
    return Array.isArray(data?.data?.languages) && data.data.languages.length > 0
      ? data.data.languages
      : [DEFAULT_LANGUAGE];
  } catch {
    return [DEFAULT_LANGUAGE];
  }
};

const getPreferredLanguage = (supportedLanguages: SupportedLanguage[]): SupportedLanguage => {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const stored = window.localStorage?.getItem("fitvibe:language") || "";
  const storedLang = stored.slice(0, 2);
  if (supportedLanguages.includes(storedLang)) {
    return storedLang;
  }

  const browserLang = window.navigator?.language?.slice(0, 2);
  if (supportedLanguages.includes(browserLang)) {
    return browserLang;
  }

  return DEFAULT_LANGUAGE;
};

const loadLoginTranslations = async (): Promise<AuthTranslations["auth"]> => {
  const supportedLanguages = await getSupportedLanguages();
  const lang = getPreferredLanguage(supportedLanguages);
  const loader = authLoaders[lang] ?? authLoaders[DEFAULT_LANGUAGE];
  try {
    const loaded = await loader();
    return loaded.default.auth;
  } catch {
    const fallback = await authLoaders[DEFAULT_LANGUAGE]();
    return fallback.default.auth;
  }
};

const loadSpa = async () => {
  await import("../main");
};

if (!form || !shell || !shouldUseShell) {
  void loadSpa();
} else {
  const translationsPromise = loadLoginTranslations();
  let copy: AuthTranslations["auth"] | null = null;

  const emailInput = form.elements.namedItem("email") as HTMLInputElement;
  const passwordInput = form.elements.namedItem("password") as HTMLInputElement;
  const toggleButton = form.querySelector<HTMLButtonElement>("[data-role='toggle-password']");
  const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
  const errorRegion = form.querySelector<HTMLDivElement>(".login-fallback__error");
  const eyebrow = shell.querySelector<HTMLElement>(".login-fallback__eyebrow");
  const title = shell.querySelector<HTMLElement>(".login-fallback__title");
  const description = shell.querySelector<HTMLElement>(".login-fallback__desc");
  const emailLabel = shell.querySelector<HTMLElement>(
    ".login-fallback__label:not(.login-fallback__label--password) span",
  );
  const passwordLabel = shell.querySelector<HTMLElement>(".login-fallback__label--password span");
  const submitText = submitButton?.querySelector("span");
  const linkItems = shell.querySelectorAll<HTMLAnchorElement>(".login-fallback__links a");

  const applyTranslations = (auth: AuthTranslations["auth"]) => {
    copy = auth;
    if (eyebrow) {
      eyebrow.textContent = auth.login.eyebrow;
    }
    if (title) {
      title.textContent = auth.login.title;
    }
    if (description) {
      description.textContent = auth.login.description;
    }
    if (emailLabel) {
      emailLabel.textContent = auth.login.emailLabel;
    }
    if (passwordLabel) {
      passwordLabel.textContent = auth.login.passwordLabel;
    }
    if (emailInput) {
      emailInput.placeholder = auth.placeholders.email;
    }
    if (passwordInput) {
      passwordInput.placeholder = auth.placeholders.password;
    }
    if (submitText) {
      submitText.textContent = auth.login.submit;
    }
    if (linkItems[0]) {
      linkItems[0].textContent = auth.login.registerPrompt;
    }
    if (linkItems[1]) {
      linkItems[1].textContent = auth.login.forgot;
    }
    if (toggleButton) {
      toggleButton.textContent = auth.showPassword;
      toggleButton.setAttribute("aria-label", auth.showPassword);
    }
  };

  void translationsPromise.then((auth) => {
    applyTranslations(auth);
  });

  const setError = (message: string | null) => {
    if (!errorRegion) {
      return;
    }
    if (message) {
      errorRegion.hidden = false;
      errorRegion.textContent = message;
    } else {
      errorRegion.hidden = true;
      errorRegion.textContent = "";
    }
  };

  const togglePasswordVisibility = () => {
    if (!toggleButton) {
      return;
    }
    const auth = copy;
    const labels = auth
      ? { show: auth.showPassword, hide: auth.hidePassword }
      : DEFAULT_TOGGLE_LABELS;
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      toggleButton.textContent = labels.hide;
      toggleButton.setAttribute("aria-label", labels.hide);
    } else {
      passwordInput.type = "password";
      toggleButton.textContent = labels.show;
      toggleButton.setAttribute("aria-label", labels.show);
    }
    passwordInput.focus();
  };

  toggleButton?.addEventListener("click", () => {
    togglePasswordVisibility();
  });

  const getReturnUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const candidate = params.get("returnUrl");
    if (
      typeof candidate === "string" &&
      candidate.startsWith("/") &&
      !candidate.startsWith("//") &&
      !candidate.includes("://")
    ) {
      return candidate;
    }
    return "/";
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const auth = copy ?? (await translationsPromise);
    if (!emailInput.value || !passwordInput.value) {
      setError(auth.login.fillAllFields);
      return;
    }

    setError(null);
    submitButton?.setAttribute("disabled", "true");
    submitButton?.classList.add("login-fallback__button--loading");

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: emailInput.value,
          password: passwordInput.value,
        }),
      });

      let data:
        | (LoginResponse & {
            error?: { code?: string; message?: string };
            termsOutdated?: boolean;
            privacyPolicyOutdated?: boolean;
          })
        | null = null;

      try {
        data = (await response.json()) as LoginResponse & {
          error?: { code?: string; message?: string };
          termsOutdated?: boolean;
          privacyPolicyOutdated?: boolean;
        };
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errorCode = data?.error?.code;
        if (
          errorCode === "TERMS_VERSION_OUTDATED" ||
          errorCode === "PRIVACY_POLICY_VERSION_OUTDATED" ||
          errorCode === "LEGAL_DOCUMENTS_VERSION_OUTDATED"
        ) {
          if (typeof window !== "undefined" && window.sessionStorage) {
            window.sessionStorage.setItem(AUTH_STORAGE_KEY, "1");
          }
          const termsOutdated = data?.termsOutdated ?? true;
          const privacyOutdated = data?.privacyPolicyOutdated ?? false;
          if (termsOutdated) {
            window.location.assign("/terms");
            return;
          }
          if (privacyOutdated) {
            window.location.assign("/privacy");
            return;
          }
        }

        throw new Error(data?.error?.message || auth.login.error);
      }

      if (data && "requires2FA" in data && data.requires2FA) {
        const returnUrl = getReturnUrl();
        const searchParams = new URLSearchParams({
          pendingSessionId: data.pendingSessionId,
        });
        if (returnUrl !== "/") {
          searchParams.set("returnUrl", returnUrl);
        }
        window.location.assign(`/login/verify-2fa?${searchParams.toString()}`);
        return;
      }

      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(AUTH_STORAGE_KEY, "1");
      }
      window.location.assign(getReturnUrl());
    } catch (error) {
      setError(error instanceof Error ? error.message : auth.login.error);
      submitButton?.removeAttribute("disabled");
      submitButton?.classList.remove("login-fallback__button--loading");
    }
  };

  form.addEventListener("submit", (event) => {
    void handleSubmit(event);
  });
}

export {};
