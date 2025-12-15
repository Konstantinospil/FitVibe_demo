import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Download, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Alert } from "../ui/Alert";

export interface BackupCodesDisplayProps {
  backupCodes: string[];
  onCodesCopied?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * BackupCodesDisplay component for showing 2FA backup codes.
 * Supports showing/hiding codes, copying individual/all codes, and downloading.
 */
export const BackupCodesDisplay: React.FC<BackupCodesDisplayProps> = ({
  backupCodes,
  onCodesCopied,
  className,
  style,
}) => {
  const { t } = useTranslation("common");
  const [showCodes, setShowCodes] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  const copyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const copyAllCodes = async () => {
    const allCodes = backupCodes.join("\n");
    try {
      await navigator.clipboard.writeText(allCodes);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
      onCodesCopied?.();
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = allCodes;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
      onCodesCopied?.();
    }
  };

  const downloadCodes = () => {
    const content = backupCodes.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitvibe-backup-codes-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={className} style={style}>
      <CardHeader>
        <CardTitle>{t("auth.2fa.backupCodes") || "Backup Codes"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="warning">
          {t("auth.2fa.backupCodesWarning") ||
            "Save these codes in a safe place. You'll need them if you lose access to your authenticator app."}
        </Alert>

        <div style={{ marginTop: "var(--space-lg)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--space-md)",
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCodes(!showCodes)}
              leftIcon={showCodes ? <EyeOff size={16} /> : <Eye size={16} />}
            >
              {showCodes
                ? t("auth.2fa.hideCodes") || "Hide Codes"
                : t("auth.2fa.showCodes") || "Show Codes"}
            </Button>
            <div style={{ display: "flex", gap: "var(--space-xs)" }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void copyAllCodes();
                }}
                leftIcon={<Copy size={16} />}
              >
                {allCopied ? t("common.copied") || "Copied!" : t("auth.2fa.copyAll") || "Copy All"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void downloadCodes();
                }}
                leftIcon={<Download size={16} />}
              >
                {t("auth.2fa.download") || "Download"}
              </Button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "var(--space-sm)",
            }}
          >
            {backupCodes.map((code, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-sm)",
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <code
                  style={{
                    fontFamily: "var(--font-family-mono)",
                    fontSize: "var(--font-size-sm)",
                    color: showCodes ? "var(--color-text-primary)" : "transparent",
                    textShadow: showCodes ? "none" : "0 0 8px var(--color-text-primary)",
                    userSelect: "none",
                  }}
                >
                  {code}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void copyCode(code, index);
                  }}
                  aria-label={
                    t("auth.2fa.copyCode", { number: index + 1 }) || `Copy code ${index + 1}`
                  }
                  style={{ minWidth: "auto", padding: "var(--space-xs)" }}
                >
                  {copiedIndex === index ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
