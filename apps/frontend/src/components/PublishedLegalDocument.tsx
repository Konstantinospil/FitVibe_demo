import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ensureLegalTranslationsLoaded } from "../i18n/config";
import {
  getPublishedLegalDocument,
  type PublishedLegalDocumentContent,
} from "../services/api";

type LegalDocumentType = "terms" | "privacy" | "cookie";

interface PublishedLegalDocumentProps {
  documentType: LegalDocumentType;
}

function naturalKeyParts(value: string): Array<string | number> {
  return value.split(/(\d+)/).filter(Boolean).map((part) => {
    const numeric = Number(part);
    return Number.isNaN(numeric) ? part : numeric;
  });
}

function compareNatural(a: string, b: string): number {
  const left = naturalKeyParts(a);
  const right = naturalKeyParts(b);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const l = left[index];
    const r = right[index];
    if (l === undefined) return -1;
    if (r === undefined) return 1;
    if (l === r) continue;
    if (typeof l === "number" && typeof r === "number") return l - r;
    return String(l).localeCompare(String(r));
  }
  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function renderTable(value: Record<string, unknown>, key: string): React.ReactNode {
  const headers = isRecord(value.headers) ? Object.values(value.headers) : [];
  const rows = isRecord(value.rows) ? Object.values(value.rows) : [];

  if (headers.length === 0 || rows.length === 0) {
    return null;
  }

  return (
    <div key={key} style={{ overflowX: "auto", marginBottom: "var(--space-md)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                style={{
                  textAlign: "left",
                  padding: "0.75rem",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {String(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const cells = isRecord(row) ? Object.values(row) : [row];
            return (
              <tr key={rowIndex}>
                {cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      verticalAlign: "top",
                    }}
                  >
                    {String(cell)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderArray(value: unknown[], key: string): React.ReactNode {
  return (
    <ul key={key} className="list">
      {value.map((item, index) => {
        if (isRecord(item)) {
          const title = typeof item.title === "string" ? item.title : null;
          const content = typeof item.content === "string" ? item.content : null;
          if (title || content) {
            return (
              <li key={index} className="list-item">
                {title ? <strong>{title}</strong> : null}
                {title && content ? " " : null}
                {content}
              </li>
            );
          }
          return (
            <li key={index} className="list-item">
              {renderObject(item, `${key}-${index}`, false)}
            </li>
          );
        }
        return (
          <li key={index} className="list-item">
            {String(item)}
          </li>
        );
      })}
    </ul>
  );
}

function renderObject(
  value: Record<string, unknown>,
  key: string,
  section: boolean,
): React.ReactNode {
  if ("headers" in value && "rows" in value) {
    return renderTable(value, key);
  }

  const title = typeof value.title === "string" ? value.title : null;
  const entries = Object.entries(value)
    .filter(([childKey]) => childKey !== "title")
    .sort(([a], [b]) => compareNatural(a, b));

  const body = entries.map(([childKey, childValue]) =>
    renderValue(childValue, `${key}-${childKey}`, childKey),
  );

  if (section || title) {
    return (
      <section key={key} className="section">
        {title ? <h2 className="section-title">{title}</h2> : null}
        {body}
      </section>
    );
  }

  return <React.Fragment key={key}>{body}</React.Fragment>;
}

function renderValue(value: unknown, key: string, sourceKey: string): React.ReactNode {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return renderArray(value, key);
  }
  if (isRecord(value)) {
    return renderObject(value, key, /^section\d+$/i.test(sourceKey));
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return (
      <p key={key} className="section-text">
        {String(value)}
      </p>
    );
  }
  return null;
}

function documentBody(content: Record<string, unknown>): React.ReactNode {
  const excluded = new Set(["title", "description", "effectiveDate", "effectiveDateValue"]);
  return Object.entries(content)
    .filter(([key]) => !excluded.has(key))
    .sort(([a], [b]) => compareNatural(a, b))
    .map(([key, value]) => renderValue(value, `legal-${key}`, key));
}

export const PublishedLegalDocument: React.FC<PublishedLegalDocumentProps> = ({ documentType }) => {
  const { i18n, t } = useTranslation();
  const [publication, setPublication] = useState<PublishedLegalDocumentContent | null>(null);
  const [legacyContent, setLegacyContent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const language = useMemo(() => i18n.language.split("-")[0] || "en", [i18n.language]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const current = await getPublishedLegalDocument(documentType, language);
        if (cancelled) return;
        setPublication(current);

        if (current.legacyWithoutSnapshot || !current.content) {
          await ensureLegalTranslationsLoaded();
          if (cancelled) return;
          const bundle = i18n.getResourceBundle(language, documentType) as unknown;
          setLegacyContent(isRecord(bundle) ? bundle : null);
        } else {
          setLegacyContent(null);
        }
      } catch {
        if (!cancelled) {
          setPublication(null);
          setLegacyContent(null);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [documentType, i18n, language]);

  if (loading) {
    return <p role="status">{t("common.loading", { defaultValue: "Loading..." })}</p>;
  }

  const content = publication?.content ?? legacyContent;
  if (loadFailed || !content) {
    return <p role="alert">{t("common.error", { defaultValue: "Document unavailable." })}</p>;
  }

  return (
    <>
      <div className="mb-1 text-muted text-09">
        <strong>{t("common.version", { defaultValue: "Version" })}:</strong>{" "}
        {publication?.version ?? "legacy"}
        {publication?.effectiveAt ? (
          <>
            {" · "}
            <strong>{t("common.effective", { defaultValue: "Effective" })}:</strong>{" "}
            {new Date(publication.effectiveAt).toLocaleDateString(language)}
          </>
        ) : null}
      </div>
      {publication?.legacyWithoutSnapshot ? (
        <p className="text-muted text-08">
          {t("common.legacyLegalDocument", {
            defaultValue:
              "This pre-publication legacy version is displayed from the retained localized source.",
          })}
        </p>
      ) : null}
      {documentBody(content)}
    </>
  );
};

export default PublishedLegalDocument;
