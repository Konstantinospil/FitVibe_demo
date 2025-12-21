import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { loadLanguageTranslations } from "../i18n/config";

/**
 * Reliable flag rendering:
 * - Tries native emoji flags first (fastest).
 * - Falls back to inline SVGs when the platform/font cannot render emoji flags (Windows w/o color emoji fonts, some Linux distros).
 */

type LangCode = "en" | "de" | "fr" | "es" | "el";

type LanguageOption = {
  code: LangCode;
  labelKey: string;
  // Either emoji or inline SVG renderer (fallback)
  emoji: string;
  Svg: React.FC<{ size?: number; style?: React.CSSProperties }>;
};

// --- Inline SVG fallbacks (simple, lightweight) ---
const GbFlag: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 20, style }) => (
  <svg
    width={size}
    height={(size * 3) / 4}
    viewBox="0 0 60 40"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ display: "inline-block", verticalAlign: "-0.2em", borderRadius: 2, ...style }}
  >
    <clipPath id="gb-clip">
      <rect width="60" height="40" rx="2" ry="2" />
    </clipPath>
    <g clipPath="url(#gb-clip)">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v40 M0,20 h60" stroke="#fff" strokeWidth="13" />
      <path d="M30,0 v40 M0,20 h60" stroke="#C8102E" strokeWidth="8" />
    </g>
  </svg>
);

const DeFlag: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 20, style }) => (
  <svg
    width={size}
    height={(size * 3) / 5}
    viewBox="0 0 3 2"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ display: "inline-block", verticalAlign: "-0.2em", borderRadius: 2, ...style }}
  >
    <rect width="3" height="2" fill="#000" />
    <rect width="3" height="1.3333" y="0.6667" fill="#DD0000" />
    <rect width="3" height="0.6667" y="1.3333" fill="#FFCE00" />
  </svg>
);

const FrFlag: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 20, style }) => (
  <svg
    width={size}
    height={(size * 3) / 5}
    viewBox="0 0 3 2"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ display: "inline-block", verticalAlign: "-0.2em", borderRadius: 2, ...style }}
  >
    <rect width="1" height="2" fill="#002654" />
    <rect width="1" height="2" x="1" fill="#FFFFFF" />
    <rect width="1" height="2" x="2" fill="#ED2939" />
  </svg>
);

const EsFlag: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 20, style }) => (
  <svg
    width={size}
    height={(size * 3) / 5}
    viewBox="0 0 3 2"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ display: "inline-block", verticalAlign: "-0.2em", borderRadius: 2, ...style }}
  >
    <rect width="3" height="0.5" fill="#AA151B" />
    <rect width="3" height="1" y="0.5" fill="#F1BF00" />
    <rect width="3" height="0.5" y="1.5" fill="#AA151B" />
  </svg>
);

const ElFlag: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 20, style }) => (
  <svg
    width={size}
    height={(size * 3) / 5}
    viewBox="0 0 3 2"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ display: "inline-block", verticalAlign: "-0.2em", borderRadius: 2, ...style }}
  >
    <rect width="3" height="2" fill="#0D5EAF" />
    <rect width="3" height="0.2857" fill="#FFFFFF" />
    <rect width="3" height="0.2857" y="0.5714" fill="#FFFFFF" />
    <rect width="3" height="0.2857" y="1.1429" fill="#FFFFFF" />
    <rect width="3" height="0.2857" y="1.7143" fill="#FFFFFF" />
  </svg>
);

// --- Language list ---
const LANGUAGES: LanguageOption[] = [
  { code: "en", labelKey: "language.english", emoji: "\uD83C\uDDEC\uD83C\uDDE7", Svg: GbFlag },
  { code: "de", labelKey: "language.german", emoji: "\uD83C\uDDE9\uD83C\uDDEA", Svg: DeFlag },
  { code: "fr", labelKey: "language.french", emoji: "\uD83C\uDDEB\uD83C\uDDF7", Svg: FrFlag },
  { code: "es", labelKey: "language.spanish", emoji: "\uD83C\uDDEA\uD83C\uDDF8", Svg: EsFlag },
  { code: "el", labelKey: "language.greek", emoji: "\uD83C\uDDEC\uD83C\uDDF7", Svg: ElFlag },
];

// --- Emoji-support detection (fast heuristic) ---
let _emojiFlagSupport: boolean | null = null;
function supportsEmojiFlag(): boolean {
  if (typeof document === "undefined") {
    _emojiFlagSupport = false;
    return _emojiFlagSupport;
  }
  if (_emojiFlagSupport !== null) {
    return _emojiFlagSupport;
  }
  try {
    // Some platforms render flag emoji as two regional letters; compare width
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      _emojiFlagSupport = false;
      return _emojiFlagSupport;
    }
    ctx.textBaseline = "top";
    ctx.font =
      "16px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Twemoji Mozilla',sans-serif";
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillText("\uD83C\uDDEC\uD83C\uDDE7", 0, 0);
    const dataEmoji = canvas.toDataURL();
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillText("GB", 0, 0);
    const dataLetters = canvas.toDataURL();
    _emojiFlagSupport = dataEmoji !== dataLetters;
    return _emojiFlagSupport;
  } catch {
    _emojiFlagSupport = false;
    return _emojiFlagSupport;
  }
}

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.4rem",
  background: "var(--color-surface-glass)",
  border: "1px solid var(--color-border)",
  borderRadius: "999px",
  color: "var(--color-text-secondary)",
  fontSize: "var(--font-size-sm)",
  padding: "0.35rem 0.75rem",
  cursor: "pointer",
  transition: "background 150ms ease",
  position: "relative",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 0.5rem)",
  right: 0,
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  minWidth: "160px",
  zIndex: 1000,
  overflow: "hidden",
};

const optionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.6rem 1rem",
  cursor: "pointer",
  transition: "background 150ms ease",
  fontSize: "var(--font-size-sm)",
  border: "none",
  background: "transparent",
  width: "100%",
  textAlign: "left",
  color: "var(--color-text-primary)",
};

function FlagIcon({ option, size = 20 }: { option: LanguageOption; size?: number }) {
  if (supportsEmojiFlag()) {
    return (
      <span
        role="img"
        aria-hidden="true"
        style={{
          fontSize: size,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        {option.emoji}
      </span>
    );
  }

  return <option.Svg size={size} />;
}

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeLanguage = (i18n.language?.slice(0, 2) || "en") as LangCode;

  // Fallback to 'en' if language is not in LANGUAGES
  const validLanguage: LangCode = LANGUAGES.find((lang) => lang.code === activeLanguage)
    ? activeLanguage
    : "en";

  const currentLanguage = LANGUAGES.find((lang) => lang.code === validLanguage) ?? LANGUAGES[0];

  const handleLanguageChange = async (code: LangCode) => {
    // Ensure translations are loaded before changing language
    await loadLanguageTranslations(code);
    await i18n.changeLanguage(code);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        display: "inline-flex",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={buttonStyle}
        aria-label={t("language.label")}
        aria-expanded={isOpen}
      >
        <FlagIcon option={currentLanguage} size={24} />
        <ChevronDown size={14} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div style={dropdownStyle} role="menu" aria-label={t("language.select")}>
          {LANGUAGES.map((option) => (
            <button
              key={option.code}
              onClick={() => {
                void handleLanguageChange(option.code);
              }}
              style={{
                ...optionStyle,
                background:
                  option.code === validLanguage ? "var(--color-surface-muted)" : "transparent",
                fontWeight: option.code === validLanguage ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (option.code !== validLanguage) {
                  e.currentTarget.style.background = "var(--color-surface-muted)";
                }
              }}
              onMouseLeave={(e) => {
                if (option.code !== validLanguage) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
              role="menuitemradio"
              aria-checked={option.code === validLanguage}
            >
              <FlagIcon option={option} size={20} />
              <span>{t(option.labelKey)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
