import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Save, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from "../components/ui";
import { Textarea } from "../components/ui/Textarea";
import {
  addBioValue,
  addPerfValue,
  addUserAttributeValue,
  createBioAttribute,
  createPerfAttribute,
  getBioAttributes,
  getPerfAttributes,
  getUserAttributes,
  updateBioVisibility,
  updatePerfVisibility,
  type MeasurementAttribute,
  type MeasurementAttributeCreateRequest,
  type MeasurementUnitType,
  type MeasurementSystem,
  type UserAttribute,
} from "../services/api";
import { logger } from "../utils/logger";

const Profile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [profileAttributes, setProfileAttributes] = useState<UserAttribute[]>([]);
  const [profileValues, setProfileValues] = useState<Record<string, string>>({});
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [savingProfileId, setSavingProfileId] = useState<string | null>(null);
  const [bioAttributes, setBioAttributes] = useState<MeasurementAttribute[]>([]);
  const [perfAttributes, setPerfAttributes] = useState<MeasurementAttribute[]>([]);
  const [bioValues, setBioValues] = useState<Record<string, string>>({});
  const [perfValues, setPerfValues] = useState<Record<string, string>>({});
  const [savingMeasurementId, setSavingMeasurementId] = useState<string | null>(null);
  const [activeMeasurementTab, setActiveMeasurementTab] = useState<"bio" | "perf">("bio");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MeasurementAttribute[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [createLabel, setCreateLabel] = useState("");
  const [createUnitType, setCreateUnitType] = useState<MeasurementUnitType>("length");
  const [createGranularity, setCreateGranularity] = useState("");
  const [createSystem, setCreateSystem] = useState<MeasurementSystem>("metric");
  const [createMinValue, setCreateMinValue] = useState("");
  const [createMaxValue, setCreateMaxValue] = useState("");
  const [createDerived, setCreateDerived] = useState(false);
  const [derivedFromAId, setDerivedFromAId] = useState("");
  const [derivedFromBId, setDerivedFromBId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const overviewSections = [
    {
      title: t("profile.sections.achievements.title"),
      description: t("profile.sections.achievements.description"),
    },
  ];

  const measurementLabels = {
    title: t("profile.measurements.title"),
    description: t("profile.measurements.description"),
    biometrical: t("profile.measurements.tabs.biometrical"),
    performance: t("profile.measurements.tabs.performance"),
    searchLabel: t("profile.measurements.search.label"),
    searchPlaceholder: t("profile.measurements.search.placeholder"),
    searching: t("profile.measurements.search.searching"),
    noResults: t("profile.measurements.search.empty"),
    unit: t("profile.measurements.tooltip.unit"),
    minMax: t("profile.measurements.tooltip.minMax"),
    add: t("profile.measurements.actions.add"),
    remove: t("profile.measurements.actions.remove"),
    createTitle: t("profile.measurements.create.title"),
    createAttribute: t("profile.measurements.create.cta"),
    attributeName: t("profile.measurements.create.attributeName"),
    attributeNamePlaceholder: t("profile.measurements.create.attributeNamePlaceholder"),
    unitType: t("profile.measurements.create.unitType"),
    granularity: t("profile.measurements.create.granularity"),
    granularityPlaceholder: t("profile.measurements.create.granularityPlaceholder"),
    measurementSystem: t("profile.measurements.create.measurementSystem"),
    minValue: t("profile.measurements.create.minValue"),
    maxValue: t("profile.measurements.create.maxValue"),
    minValuePlaceholder: t("profile.measurements.create.minValuePlaceholder"),
    maxValuePlaceholder: t("profile.measurements.create.maxValuePlaceholder"),
    ratioToggleLabel: t("profile.measurements.create.ratioToggleLabel"),
    ratioSourceA: t("profile.measurements.create.ratioSourceA"),
    ratioSourceB: t("profile.measurements.create.ratioSourceB"),
    derived: t("profile.measurements.derived"),
  };

  const unitTypeOptions = [
    { value: "length", label: t("profile.measurements.unitTypes.length") },
    { value: "weight", label: t("profile.measurements.unitTypes.weight") },
    { value: "volume", label: t("profile.measurements.unitTypes.volume") },
    { value: "ratio", label: t("profile.measurements.unitTypes.ratio") },
    { value: "count", label: t("profile.measurements.unitTypes.count") },
    { value: "time", label: t("profile.measurements.unitTypes.time") },
    { value: "power", label: t("profile.measurements.unitTypes.power") },
    { value: "percentage", label: t("profile.measurements.unitTypes.percentage") },
  ];

  const systemOptions = [
    { value: "metric", label: t("profile.measurements.system.metric") },
    { value: "imperial", label: t("profile.measurements.system.imperial") },
  ];

  const activeAttributes = activeMeasurementTab === "bio" ? bioAttributes : perfAttributes;
  const derivedOptions = activeAttributes.map((attribute) => ({
    value: attribute.id,
    label: t(`user_attributes.${attribute.key}`, {
      defaultValue: attribute.label,
    }),
  }));

  useEffect(() => {
    const loadProfileAttributes = async () => {
      try {
        const response = await getUserAttributes();
        setProfileAttributes(response.attributes);
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
        setProfileValues(initialValues);
      } catch (error) {
        logger.apiError(
          "Failed to load user attributes",
          error,
          "/api/v1/users/me/attributes",
          "GET",
        );
      }
    };

    void loadProfileAttributes();
  }, []);

  useEffect(() => {
    const loadMeasurements = async () => {
      try {
        const [bioResponse, perfResponse] = await Promise.all([
          getBioAttributes({ includeHidden: true, lang: i18n.language }),
          getPerfAttributes({ includeHidden: true, lang: i18n.language }),
        ]);
        setBioAttributes(bioResponse.attributes);
        setPerfAttributes(perfResponse.attributes);

        const nextBioValues: Record<string, string> = {};
        bioResponse.attributes.forEach((attribute) => {
          nextBioValues[attribute.id] = attribute.latestValue
            ? attribute.latestValue.valueNumber.toString()
            : "";
        });
        setBioValues(nextBioValues);

        const nextPerfValues: Record<string, string> = {};
        perfResponse.attributes.forEach((attribute) => {
          nextPerfValues[attribute.id] = attribute.latestValue
            ? attribute.latestValue.valueNumber.toString()
            : "";
        });
        setPerfValues(nextPerfValues);
      } catch (error) {
        logger.apiError(
          "Failed to load profile measurements",
          error,
          "/api/v1/measurements",
          "GET",
        );
      }
    };

    void loadMeasurements();
  }, [i18n.language]);

  const attributeByKey = useMemo(() => {
    const map = new Map<string, UserAttribute>();
    profileAttributes.forEach((attribute) => {
      map.set(attribute.key, attribute);
    });
    return map;
  }, [profileAttributes]);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setSearchResults([]);
      setCreateLabel("");
      return;
    }

    const loadSearchResults = async () => {
      setIsSearching(true);
      try {
        const response =
          activeMeasurementTab === "bio"
            ? await getBioAttributes({ q: trimmed, includeHidden: true, lang: i18n.language })
            : await getPerfAttributes({ q: trimmed, includeHidden: true, lang: i18n.language });
        setSearchResults(response.attributes);
        setCreateLabel(trimmed);
      } catch (error) {
        logger.apiError("Failed to search measurements", error, "/api/v1/measurements", "GET");
      } finally {
        setIsSearching(false);
      }
    };

    void loadSearchResults();
  }, [searchTerm, activeMeasurementTab, i18n.language]);

  const visibleBioAttributes = useMemo(
    () => bioAttributes.filter((attribute) => attribute.isVisible),
    [bioAttributes],
  );

  const visiblePerfAttributes = useMemo(
    () => perfAttributes.filter((attribute) => attribute.isVisible),
    [perfAttributes],
  );

  const [bioLeft, bioRight] = useMemo(() => {
    const midpoint = Math.ceil(visibleBioAttributes.length / 2);
    return [visibleBioAttributes.slice(0, midpoint), visibleBioAttributes.slice(midpoint)];
  }, [visibleBioAttributes]);

  const handleProfileValueChange = (attributeId: string, nextValue: string) => {
    setProfileValues((prev) => ({ ...prev, [attributeId]: nextValue }));
  };

  const handleProfileSave = async (attribute: UserAttribute) => {
    setSavingProfileId(attribute.id);
    try {
      const rawValue = profileValues[attribute.id] ?? "";
      const valueType = attribute.valueType;
      const payload =
        valueType === "number"
          ? { valueNumber: rawValue === "" ? undefined : Number(rawValue) }
          : valueType === "date"
            ? { valueDate: rawValue || undefined }
            : { valueText: rawValue };

      const response = await addUserAttributeValue(attribute.id, payload);
      setProfileAttributes((prev) =>
        prev.map((item) =>
          item.id === attribute.id ? { ...item, latestValue: response.latestValue } : item,
        ),
      );
      setEditingProfileId(null);
    } catch (error) {
      logger.apiError(
        "Failed to update user attribute",
        error,
        `/api/v1/users/me/attributes/${attribute.id}`,
        "POST",
      );
    } finally {
      setSavingProfileId(null);
    }
  };

  const renderAttributeField = (attribute: UserAttribute, isTextarea = false) => {
    const isEditing = editingProfileId === attribute.id;
    const value = profileValues[attribute.id] ?? "";
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
            onChange={(event) => handleProfileValueChange(attribute.id, event.target.value)}
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
            onChange={(event) => handleProfileValueChange(attribute.id, event.target.value)}
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
                  void handleProfileSave(attribute);
                }}
                disabled={savingProfileId === attribute.id}
              >
                {savingProfileId === attribute.id ? t("common.saving") : t("common.save")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditingProfileId(null)}
              >
                {t("common.cancel")}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditingProfileId(attribute.id)}
            >
              {t("common.edit")}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const handleMeasurementValueChange = (
    category: "bio" | "perf",
    attributeId: string,
    nextValue: string,
  ) => {
    if (category === "bio") {
      setBioValues((prev) => ({ ...prev, [attributeId]: nextValue }));
      return;
    }
    setPerfValues((prev) => ({ ...prev, [attributeId]: nextValue }));
  };

  const commitMeasurementValue = async (
    category: "bio" | "perf",
    attribute: MeasurementAttribute,
    valueNumber: number,
  ) => {
    if (attribute.derivedOperator) {
      return;
    }
    setSavingMeasurementId(attribute.id);
    try {
      const response =
        category === "bio"
          ? await addBioValue(attribute.id, { valueNumber })
          : await addPerfValue(attribute.id, { valueNumber });
      if (category === "bio") {
        setBioAttributes((prev) =>
          prev.map((item) =>
            item.id === attribute.id ? { ...item, latestValue: response.latestValue } : item,
          ),
        );
        setBioValues((prev) => ({
          ...prev,
          [attribute.id]: response.latestValue.valueNumber.toString(),
        }));
      } else {
        setPerfAttributes((prev) =>
          prev.map((item) =>
            item.id === attribute.id ? { ...item, latestValue: response.latestValue } : item,
          ),
        );
        setPerfValues((prev) => ({
          ...prev,
          [attribute.id]: response.latestValue.valueNumber.toString(),
        }));
      }
    } catch (error) {
      logger.apiError(
        "Failed to update measurement value",
        error,
        `/api/v1/measurements/${category === "bio" ? "biometrics" : "performance"}/attributes/${
          attribute.id
        }/values`,
        "POST",
      );
    } finally {
      setSavingMeasurementId(null);
    }
  };

  const handleToggleVisibility = async (
    category: "bio" | "perf",
    attribute: MeasurementAttribute,
  ) => {
    const nextVisible = !attribute.isVisible;
    try {
      if (category === "bio") {
        await updateBioVisibility(attribute.id, nextVisible);
        setBioAttributes((prev) =>
          prev.map((item) =>
            item.id === attribute.id ? { ...item, isVisible: nextVisible } : item,
          ),
        );
      } else {
        await updatePerfVisibility(attribute.id, nextVisible);
        setPerfAttributes((prev) =>
          prev.map((item) =>
            item.id === attribute.id ? { ...item, isVisible: nextVisible } : item,
          ),
        );
      }
      setSearchResults((prev) =>
        prev.map((item) => (item.id === attribute.id ? { ...item, isVisible: nextVisible } : item)),
      );
    } catch (error) {
      logger.apiError(
        "Failed to update measurement visibility",
        error,
        `/api/v1/measurements/${category === "bio" ? "biometrics" : "performance"}/attributes/${
          attribute.id
        }/visibility`,
        "PUT",
      );
    }
  };

  const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

  const hasExactMatch =
    searchTerm.trim().length > 0 &&
    searchResults.some((attribute) => attribute.normalizedKey === normalizeName(searchTerm));

  const handleCreateAttribute = async () => {
    if (!createLabel.trim()) {
      return;
    }
    const minValue = createMinValue.trim();
    const maxValue = createMaxValue.trim();
    const parsedMin = minValue ? Number(minValue) : null;
    const parsedMax = maxValue ? Number(maxValue) : null;
    if (minValue && Number.isNaN(parsedMin)) {
      return;
    }
    if (maxValue && Number.isNaN(parsedMax)) {
      return;
    }

    setIsCreating(true);
    try {
      if (createDerived) {
        setCreateUnitType("ratio");
        setCreateGranularity("ratio");
      }
      const payload: MeasurementAttributeCreateRequest = {
        label: createLabel.trim(),
        unitType: createDerived ? "ratio" : createUnitType,
        granularity: createDerived ? "ratio" : createGranularity.trim(),
        measurementSystem: createSystem,
        minValue: parsedMin ?? undefined,
        maxValue: parsedMax ?? undefined,
        derivedFromAId: createDerived ? derivedFromAId : undefined,
        derivedFromBId: createDerived ? derivedFromBId : undefined,
        derivedOperator: createDerived ? "ratio" : undefined,
      };
      const response =
        activeMeasurementTab === "bio"
          ? await createBioAttribute(payload)
          : await createPerfAttribute(payload);
      const createdAttribute = { ...response.attribute, isVisible: true };
      if (activeMeasurementTab === "bio") {
        await updateBioVisibility(createdAttribute.id, true);
        setBioAttributes((prev) => [...prev, createdAttribute]);
        setBioValues((prev) => ({ ...prev, [createdAttribute.id]: "" }));
      } else {
        await updatePerfVisibility(createdAttribute.id, true);
        setPerfAttributes((prev) => [...prev, createdAttribute]);
        setPerfValues((prev) => ({ ...prev, [createdAttribute.id]: "" }));
      }
      setSearchResults([]);
      setSearchTerm("");
      setCreateLabel("");
      setCreateGranularity("");
      setCreateMinValue("");
      setCreateMaxValue("");
      setCreateDerived(false);
      setDerivedFromAId("");
      setDerivedFromBId("");
    } catch (error) {
      logger.apiError(
        "Failed to create measurement attribute",
        error,
        `/api/v1/measurements/${activeMeasurementTab === "bio" ? "biometrics" : "performance"}/attributes`,
        "POST",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const renderMeasurementField = (category: "bio" | "perf", attribute: MeasurementAttribute) => {
    const valueMap = category === "bio" ? bioValues : perfValues;
    const isDerived = Boolean(attribute.derivedOperator);
    const derivedValue =
      isDerived && attribute.latestValue ? attribute.latestValue.valueNumber : null;
    const value = isDerived
      ? derivedValue === null
        ? ""
        : (derivedValue * 100).toFixed(2)
      : (valueMap[attribute.id] ?? "");
    const unitLabel = isDerived
      ? " (%)"
      : attribute.granularity
        ? ` (${attribute.granularity})`
        : "";
    const attributeLabel = t(`user_attributes.${attribute.key}`, {
      defaultValue: attribute.label,
    });

    const commitFromInput = () => {
      if (isDerived) {
        return;
      }
      const rawValue = valueMap[attribute.id] ?? "";
      if (!rawValue.trim()) {
        return;
      }
      const valueNumber = Number(rawValue);
      if (Number.isNaN(valueNumber)) {
        return;
      }
      void commitMeasurementValue(category, attribute, valueNumber);
    };

    return (
      <div key={attribute.id} className="profile-measurement-field">
        <label className="profile-measurement-label">{`${attributeLabel}${unitLabel}`}</label>
        <div className="profile-measurement-control">
          <button
            type="button"
            className="profile-measurement-button"
            onClick={() => void handleToggleVisibility(category, attribute)}
            disabled={savingMeasurementId === attribute.id}
            aria-label={measurementLabels.remove}
          >
            <Trash2 className="profile-measurement-icon" aria-hidden="true" />
          </button>
          <input
            className="profile-measurement-input"
            type="number"
            step="0.01"
            value={value}
            onChange={(event) =>
              handleMeasurementValueChange(category, attribute.id, event.target.value)
            }
            onBlur={commitFromInput}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitFromInput();
              }
            }}
            readOnly={isDerived}
            aria-label={`${attributeLabel}${unitLabel}`}
          />
          <button
            type="button"
            className="profile-measurement-button"
            onClick={commitFromInput}
            disabled={isDerived || savingMeasurementId === attribute.id}
            aria-label={measurementLabels.add}
          >
            <Save className="profile-measurement-icon" aria-hidden="true" />
          </button>
        </div>
        {isDerived ? (
          <span className="profile-derived-pill">{measurementLabels.derived}</span>
        ) : null}
      </div>
    );
  };

  return (
    <section className="profile-page">
      <header className="profile-intro">
        <span className="profile-intro-eyebrow">
          <span className="profile-intro-accent" aria-hidden="true" />
          <span>{t("profile.eyebrow")}</span>
        </span>
        <h1 className="profile-intro-title">{t("profile.title")}</h1>
        <p className="profile-intro-description">{t("profile.description")}</p>
      </header>

      <div className="profile-stack">
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
            <CardTitle>{measurementLabels.title}</CardTitle>
            <CardDescription>{measurementLabels.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="profile-measurements">
              <aside className="profile-measurements-tabs">
                <button
                  type="button"
                  className={`profile-measurements-tab ${
                    activeMeasurementTab === "bio" ? "is-active" : ""
                  }`}
                  onClick={() => setActiveMeasurementTab("bio")}
                >
                  {measurementLabels.biometrical}
                </button>
                <button
                  type="button"
                  className={`profile-measurements-tab ${
                    activeMeasurementTab === "perf" ? "is-active" : ""
                  }`}
                  onClick={() => setActiveMeasurementTab("perf")}
                >
                  {measurementLabels.performance}
                </button>
              </aside>
              <div className="profile-measurements-content">
                <div className="profile-measurements-search">
                  <Input
                    label={measurementLabels.searchLabel}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={measurementLabels.searchPlaceholder}
                  />
                  {searchTerm.trim().length > 0 && (
                    <div className="profile-measurements-results">
                      {isSearching ? (
                        <span className="profile-measurements-muted">
                          {measurementLabels.searching}
                        </span>
                      ) : searchResults.length ? (
                        searchResults.map((attribute) => (
                          <div key={attribute.id} className="profile-measurements-result">
                            <div className="profile-measurements-result-info">
                              <span className="profile-measurements-result-label">
                                {t(`user_attributes.${attribute.key}`, {
                                  defaultValue: attribute.label,
                                })}
                              </span>
                              <span className="profile-measurements-result-meta">
                                {attribute.granularity}
                              </span>
                              <div className="profile-measurements-tooltip">
                                <div>
                                  {measurementLabels.unit}: {attribute.unitType} (
                                  {attribute.granularity})
                                </div>
                                <div>
                                  {measurementLabels.minMax}:{" "}
                                  {attribute.measurementSystem === "metric"
                                    ? `${attribute.minValueMetric ?? "-"} / ${
                                        attribute.maxValueMetric ?? "-"
                                      }`
                                    : `${attribute.minValueImperial ?? "-"} / ${
                                        attribute.maxValueImperial ?? "-"
                                      }`}
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={attribute.isVisible ? "secondary" : "primary"}
                              onClick={() =>
                                void handleToggleVisibility(activeMeasurementTab, attribute)
                              }
                            >
                              {attribute.isVisible
                                ? measurementLabels.remove
                                : measurementLabels.add}
                            </Button>
                          </div>
                        ))
                      ) : (
                        <span className="profile-measurements-muted">
                          {measurementLabels.noResults}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {searchTerm.trim().length > 0 && !hasExactMatch && (
                  <div className="profile-measurements-create">
                    <div className="profile-measurements-create-grid">
                      <Input
                        label={measurementLabels.attributeName}
                        value={createLabel}
                        onChange={(event) => setCreateLabel(event.target.value)}
                        placeholder={measurementLabels.attributeNamePlaceholder}
                      />
                      <label className="profile-measurements-toggle">
                        <input
                          type="checkbox"
                          checked={createDerived}
                          onChange={(event) => setCreateDerived(event.target.checked)}
                        />
                        <span>{measurementLabels.ratioToggleLabel}</span>
                      </label>
                      <Select
                        label={measurementLabels.unitType}
                        value={createUnitType}
                        onChange={(event) =>
                          setCreateUnitType(event.target.value as MeasurementUnitType)
                        }
                        options={unitTypeOptions}
                        disabled={createDerived}
                      />
                      <Input
                        label={measurementLabels.granularity}
                        value={createGranularity}
                        onChange={(event) => setCreateGranularity(event.target.value)}
                        placeholder={measurementLabels.granularityPlaceholder}
                        disabled={createDerived}
                      />
                      <Select
                        label={measurementLabels.measurementSystem}
                        value={createSystem}
                        onChange={(event) =>
                          setCreateSystem(event.target.value as MeasurementSystem)
                        }
                        options={systemOptions}
                        disabled={createDerived}
                      />
                      {createDerived ? (
                        <>
                          <Select
                            label={measurementLabels.ratioSourceA}
                            value={derivedFromAId}
                            onChange={(event) => setDerivedFromAId(event.target.value)}
                            options={derivedOptions}
                            placeholder={measurementLabels.ratioSourceA}
                          />
                          <Select
                            label={measurementLabels.ratioSourceB}
                            value={derivedFromBId}
                            onChange={(event) => setDerivedFromBId(event.target.value)}
                            options={derivedOptions}
                            placeholder={measurementLabels.ratioSourceB}
                          />
                        </>
                      ) : (
                        <>
                          <Input
                            label={measurementLabels.minValue}
                            type="number"
                            value={createMinValue}
                            onChange={(event) => setCreateMinValue(event.target.value)}
                            placeholder={measurementLabels.minValuePlaceholder}
                          />
                          <Input
                            label={measurementLabels.maxValue}
                            type="number"
                            value={createMaxValue}
                            onChange={(event) => setCreateMaxValue(event.target.value)}
                            placeholder={measurementLabels.maxValuePlaceholder}
                          />
                        </>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={() => void handleCreateAttribute()}
                      disabled={
                        isCreating ||
                        !createLabel.trim() ||
                        (!createDerived && !createGranularity.trim()) ||
                        (createDerived && (!derivedFromAId || !derivedFromBId))
                      }
                    >
                      {isCreating ? t("common.saving") : measurementLabels.createAttribute}
                    </Button>
                  </div>
                )}

                {activeMeasurementTab === "bio" ? (
                  <div className="profile-measurements-section">
                    <div className="profile-body-grid">
                      <div className="profile-stack">
                        {bioLeft.map((attribute) => renderMeasurementField("bio", attribute))}
                      </div>
                      <div className="profile-body-figure">
                        <svg
                          viewBox="0 0 200 360"
                          role="img"
                          aria-label={t("profile.body.mapAriaLabel")}
                        >
                          <defs>
                            <linearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(148, 163, 184, 0.85)" />
                              <stop offset="100%" stopColor="rgba(148, 163, 184, 0.3)" />
                            </linearGradient>
                          </defs>
                          <circle cx="100" cy="40" r="26" fill="url(#bodyGradient)" />
                          <rect
                            x="78"
                            y="64"
                            width="44"
                            height="28"
                            rx="14"
                            fill="url(#bodyGradient)"
                          />
                          <rect
                            x="52"
                            y="88"
                            width="96"
                            height="140"
                            rx="48"
                            fill="url(#bodyGradient)"
                          />
                          <rect
                            x="40"
                            y="110"
                            width="20"
                            height="120"
                            rx="10"
                            fill="url(#bodyGradient)"
                          />
                          <rect
                            x="140"
                            y="110"
                            width="20"
                            height="120"
                            rx="10"
                            fill="url(#bodyGradient)"
                          />
                          <rect
                            x="76"
                            y="228"
                            width="20"
                            height="112"
                            rx="10"
                            fill="url(#bodyGradient)"
                          />
                          <rect
                            x="104"
                            y="228"
                            width="20"
                            height="112"
                            rx="10"
                            fill="url(#bodyGradient)"
                          />
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
                        {bioRight.map((attribute) => renderMeasurementField("bio", attribute))}
                      </div>
                    </div>
                    <span className="profile-section-note">{t("profile.body.note")}</span>
                  </div>
                ) : (
                  <div className="profile-measurements-section">
                    <div className="profile-grid-3">
                      {visiblePerfAttributes.map((attribute) =>
                        renderMeasurementField("perf", attribute),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Profile;
