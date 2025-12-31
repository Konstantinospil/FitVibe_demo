import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import PageIntro from "../components/PageIntro";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "../components/ui";
import { Textarea } from "../components/ui/Textarea";
import { addUserAttributeValue, getUserAttributes, type UserAttribute } from "../services/api";
import { logger } from "../utils/logger";

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const [attributes, setAttributes] = useState<UserAttribute[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const overviewSections = [
    {
      title: t("profile.sections.visibility.title"),
      description: t("profile.sections.visibility.description"),
    },
    {
      title: t("profile.sections.units.title"),
      description: t("profile.sections.units.description"),
    },
    {
      title: t("profile.sections.achievements.title"),
      description: t("profile.sections.achievements.description"),
    },
  ];

  useEffect(() => {
    const loadAttributes = async () => {
      try {
        const response = await getUserAttributes();
        setAttributes(response.attributes);
        const initialValues: Record<string, string> = {};
        response.attributes.forEach((attribute) => {
          const latest = attribute.latestValue;
          if (!latest) {
            initialValues[attribute.id] = "";
            return;
          }
          if (latest.valueNumber !== null) {
            initialValues[attribute.id] = latest.valueNumber.toString();
            return;
          }
          if (latest.valueDate) {
            initialValues[attribute.id] = latest.valueDate;
            return;
          }
          if (latest.valueText !== null) {
            initialValues[attribute.id] = latest.valueText;
            return;
          }
          initialValues[attribute.id] = "";
        });
        setValues(initialValues);
      } catch (error) {
        logger.apiError(
          "Failed to load user attributes",
          error,
          "/api/v1/users/me/attributes",
          "GET",
        );
      }
    };

    void loadAttributes();
  }, []);

  const attributeByKey = useMemo(() => {
    const map = new Map<string, UserAttribute>();
    attributes.forEach((attribute) => {
      map.set(attribute.key, attribute);
    });
    return map;
  }, [attributes]);

  const bodyLeftKeys = [
    "weight_kg",
    "body_fat_pct",
    "bone_weight_kg",
    "body_water_pct",
    "height_cm",
  ] as const;

  const bodyRightKeys = [
    "chest_circumference_cm",
    "waist_circumference_cm",
    "hip_circumference_cm",
    "bicep_circumference_cm",
    "thigh_circumference_cm",
    "calf_circumference_cm",
  ] as const;

  const performanceKeys = [
    "vo2_max",
    "ftp_watts",
    "run_12min_m",
    "dash_100m_sec",
    "pushups_1min",
    "chest_press_1rm_kg",
    "squat_1rm_kg",
    "deadlift_1rm_kg",
    "shoulder_press_1rm_kg",
    "vertical_jump_cm",
    "horizontal_jump_cm",
    "sit_and_reach_cm",
  ] as const;

  const handleValueChange = (attributeId: string, nextValue: string) => {
    setValues((prev) => ({ ...prev, [attributeId]: nextValue }));
  };

  const handleSave = async (attribute: UserAttribute) => {
    setSavingId(attribute.id);
    try {
      const rawValue = values[attribute.id] ?? "";
      const valueType = attribute.valueType;
      const payload =
        valueType === "number"
          ? { valueNumber: rawValue === "" ? undefined : Number(rawValue) }
          : valueType === "date"
            ? { valueDate: rawValue || undefined }
            : { valueText: rawValue };

      const response = await addUserAttributeValue(attribute.id, payload);
      setAttributes((prev) =>
        prev.map((item) =>
          item.id === attribute.id ? { ...item, latestValue: response.latestValue } : item,
        ),
      );
      setEditingId(null);
    } catch (error) {
      logger.apiError(
        "Failed to update user attribute",
        error,
        `/api/v1/users/me/attributes/${attribute.id}`,
        "POST",
      );
    } finally {
      setSavingId(null);
    }
  };

  const renderAttributeField = (attribute: UserAttribute, isTextarea = false) => {
    const isEditing = editingId === attribute.id;
    const value = values[attribute.id] ?? "";
    const unitSuffix = attribute.unit ? ` (${attribute.unit})` : "";

    return (
      <div
        key={attribute.id}
        className={
          isTextarea
            ? "profile-attribute-row profile-attribute-row--textarea"
            : "profile-attribute-row"
        }
      >
        {isTextarea ? (
          <Textarea
            label={`${attribute.label}${unitSuffix}`}
            rows={4}
            value={value}
            onChange={(event) => handleValueChange(attribute.id, event.target.value)}
            disabled={!isEditing}
            placeholder={attribute.label}
          />
        ) : (
          <Input
            label={`${attribute.label}${unitSuffix}`}
            type={
              attribute.valueType === "number"
                ? "number"
                : attribute.valueType === "date"
                  ? "date"
                  : "text"
            }
            step={attribute.valueType === "number" ? "0.1" : undefined}
            value={value}
            onChange={(event) => handleValueChange(attribute.id, event.target.value)}
            disabled={!isEditing}
            placeholder={attribute.label}
          />
        )}
        <div
          className={
            isTextarea
              ? "profile-attribute-actions profile-attribute-actions--textarea"
              : "profile-attribute-actions"
          }
        >
          {isEditing ? (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  void handleSave(attribute);
                }}
                disabled={savingId === attribute.id}
              >
                {savingId === attribute.id ? t("common.saving") : t("common.save")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditingId(null)}
              >
                {t("common.cancel")}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditingId(attribute.id)}
            >
              {t("common.edit")}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <PageIntro
      eyebrow={t("profile.eyebrow")}
      title={t("profile.title")}
      description={t("profile.description")}
    >
      <div className="profile-stack">
        <div className="flex flex--justify-end">
          <Button type="button" variant="secondary">
            {t("profile.edit")}
          </Button>
        </div>

        {overviewSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>{t("profile.social.title")}</CardTitle>
            <CardDescription>{t("profile.social.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="profile-grid-2">
              {attributeByKey.get("display_name") &&
                renderAttributeField(attributeByKey.get("display_name")!)}
              {attributeByKey.get("full_name") &&
                renderAttributeField(attributeByKey.get("full_name")!)}
            </div>
            <div className="profile-grid-2">
              {attributeByKey.get("date_of_birth") &&
                renderAttributeField(attributeByKey.get("date_of_birth")!)}
              {attributeByKey.get("motto") && renderAttributeField(attributeByKey.get("motto")!)}
            </div>
            {attributeByKey.get("biography") &&
              renderAttributeField(attributeByKey.get("biography")!, true)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("profile.body.title")}</CardTitle>
            <CardDescription>{t("profile.body.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="profile-body-grid">
              <div className="profile-stack">
                {bodyLeftKeys.map((key) => {
                  const attribute = attributeByKey.get(key);
                  return attribute ? renderAttributeField(attribute) : null;
                })}
              </div>
              <div className="profile-body-figure">
                <svg viewBox="0 0 200 360" role="img" aria-label={t("profile.body.mapAriaLabel")}>
                  <defs>
                    <linearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(148, 163, 184, 0.85)" />
                      <stop offset="100%" stopColor="rgba(148, 163, 184, 0.3)" />
                    </linearGradient>
                  </defs>
                  <circle cx="100" cy="40" r="26" fill="url(#bodyGradient)" />
                  <rect x="78" y="64" width="44" height="28" rx="14" fill="url(#bodyGradient)" />
                  <rect x="52" y="88" width="96" height="140" rx="48" fill="url(#bodyGradient)" />
                  <rect x="40" y="110" width="20" height="120" rx="10" fill="url(#bodyGradient)" />
                  <rect x="140" y="110" width="20" height="120" rx="10" fill="url(#bodyGradient)" />
                  <rect x="76" y="228" width="20" height="112" rx="10" fill="url(#bodyGradient)" />
                  <rect x="104" y="228" width="20" height="112" rx="10" fill="url(#bodyGradient)" />
                  <line
                    x1="40"
                    y1="132"
                    x2="160"
                    y2="132"
                    stroke="rgba(255,255,255,0.4)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="44"
                    y1="172"
                    x2="156"
                    y2="172"
                    stroke="rgba(255,255,255,0.4)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="56"
                    y1="210"
                    x2="144"
                    y2="210"
                    stroke="rgba(255,255,255,0.4)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="78"
                    y1="268"
                    x2="122"
                    y2="268"
                    stroke="rgba(255,255,255,0.4)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="78"
                    y1="320"
                    x2="122"
                    y2="320"
                    stroke="rgba(255,255,255,0.4)"
                    strokeDasharray="4 4"
                  />
                </svg>
                <span className="profile-body-caption">{t("profile.body.mapLabel")}</span>
              </div>
              <div className="profile-stack">
                {bodyRightKeys.map((key) => {
                  const attribute = attributeByKey.get(key);
                  return attribute ? renderAttributeField(attribute) : null;
                })}
              </div>
            </div>
            <span className="profile-section-note">{t("profile.body.note")}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("profile.performance.title")}</CardTitle>
            <CardDescription>{t("profile.performance.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="profile-grid-3">
              {performanceKeys.map((key) => {
                const attribute = attributeByKey.get(key);
                return attribute ? renderAttributeField(attribute) : null;
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageIntro>
  );
};

export default Profile;
