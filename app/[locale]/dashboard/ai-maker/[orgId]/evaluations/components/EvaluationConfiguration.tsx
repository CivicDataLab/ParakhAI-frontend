"use client";

import React, { useEffect } from "react";
import { Text, TextField, Label, Select, Combobox, Spinner } from "opub-ui";
import type { SelectOption } from "./types";
import styles from "./styles.module.scss";

type AuditType = "Technical" | "Domain" | "Cultural";

type Module = {
  name: string;
  displayName: string;
  description: string;
  metrics: Array<{
    name: string;
    displayName: string;
    description: string;
  }>;
};

interface EvaluationConfigurationProps {
  auditType: AuditType;
  setAuditType: (type: AuditType) => void;
  auditorName: string;
  setAuditorName: (value: string) => void;
  organisationName: string;
  setOrganisationName: (value: string) => void;
  auditObjective: string;
  setAuditObjective: (value: string) => void;
  auditScope: string;
  setAuditScope: (value: string) => void;
  evaluationScopeOptions: SelectOption[];
  modeOfEvaluation: string;
  setModeOfEvaluation: (value: string) => void;
  modules: Module[];
  selectedModules: Record<string, boolean>;
  setSelectedModules: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  selectedMetrics: Record<string, SelectOption[]>;
  setSelectedMetrics: React.Dispatch<
    React.SetStateAction<Record<string, SelectOption[]>>
  >;
  moduleMetricsOptions: Record<string, SelectOption[]>;
  setModuleMetricsOptions: React.Dispatch<
    React.SetStateAction<Record<string, SelectOption[]>>
  >;
  isLoadingModules: boolean;
  modulesError: string | null;
  fetchMetricsForModule: (moduleName: string) => Promise<SelectOption[]>;
  getModuleDisplayName: (moduleName: string) => string;
  toTitleCase: (str: string) => string;
  validationErrors?: {
    auditorName?: string;
    organisationName?: string;
    auditObjective?: string;
    auditScope?: string;
    modeOfEvaluation?: string;
    modules?: string;
    metrics?: string;
  };
  setValidationErrors?: React.Dispatch<
    React.SetStateAction<{
      auditorName?: string;
      organisationName?: string;
      auditObjective?: string;
      auditScope?: string;
      modeOfEvaluation?: string;
      modules?: string;
      metrics?: string;
    }>
  >;
}

const EvaluationConfiguration: React.FC<EvaluationConfigurationProps> = ({
  auditType,
  setAuditType,
  auditorName,
  setAuditorName,
  organisationName,
  setOrganisationName,
  auditObjective,
  setAuditObjective,
  auditScope,
  setAuditScope,
  evaluationScopeOptions,
  modeOfEvaluation,
  setModeOfEvaluation,
  modules,
  selectedModules,
  setSelectedModules,
  selectedMetrics,
  setSelectedMetrics,
  moduleMetricsOptions,
  setModuleMetricsOptions,
  isLoadingModules,
  modulesError,
  fetchMetricsForModule,
  getModuleDisplayName,
  toTitleCase,
  validationErrors = {},
  setValidationErrors,
}) => {
  const modeOfEvaluationOptions = [
    { value: "automated", label: "Automated" },
    { value: "manual", label: "Manual" },
  ];

  // Automatically set mode of evaluation to "manual" when domain or cultural evaluation is selected
  useEffect(() => {
    if ((auditType === "Domain" || auditType === "Cultural") && modeOfEvaluation !== "manual") {
      setModeOfEvaluation("manual");
    }
  }, [auditType, modeOfEvaluation, setModeOfEvaluation]);

  // Helper function to format selected metrics as comma-separated string with truncation
  const formatSelectedMetrics = (selected: SelectOption[]): string => {
    if (!selected || selected.length === 0) {
      return "Select sub-modules from dropdown";
    }

    const labels = selected.map((item) => item.label);
    const joined = labels.join(", ");

    if (joined.length <= 40) {
      return joined;
    }

    return joined.substring(0, 37) + "...";
  };

  return (
    <div className="mb-8">
      <Label htmlFor="auditType" className={`block ${styles.auditTypeLabel}`}>
        <Text variant="bodyMd" fontWeight="medium">
          Evaluation Type <span className="text-red-500">*</span>
        </Text>
      </Label>

      <div className={`flex gap-4 flex-wrap ${styles.auditOptionsContainer}`}>
        {/* Technical Audit Option */}
        <label
          className={`flex items-start gap-3 cursor-pointer transition-all ${styles.technicalAuditCard} ${auditType === "Technical" ? "" : ""
            }`}
        >
          <input
            type="radio"
            name="auditType"
            value="Technical"
            checked={auditType === "Technical"}
            onChange={(e) => setAuditType(e.target.value as AuditType)}
            className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
          />
          <div className="flex-1">
            <Text
              variant="bodyMd"
              fontWeight="semibold"
              className="text-gray-900 mb-2"
            >
              Technical Evaluation
            </Text>
            <Text
              variant="bodySm"
              className="text-gray-600 block"
            >
              Check performance, safety, drift
            </Text>
          </div>
        </label>

        {/* Domain Audit Option */}
        <label
          className={`flex items-start gap-3 cursor-pointer transition-all ${styles.domainAuditCard} ${auditType === "Domain" ? "" : ""
            }`}
        >
          <input
            type="radio"
            name="auditType"
            value="Domain"
            checked={auditType === "Domain"}
            onChange={(e) => setAuditType(e.target.value as AuditType)}
            className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
          />
          <div className="flex-1">
            <Text
              variant="bodyMd"
              fontWeight="semibold"
              className="text-gray-900 mb-2"
            >
              Domain Evaluation
            </Text>
            <Text
              variant="bodySm"
              className="text-gray-600 block"
            >
              Check accuracy within domain context
            </Text>
          </div>
        </label>

        {/* Cultural Audit Option */}
        <label
          className={`flex items-start gap-3 cursor-pointer transition-all ${styles.culturalAuditCard} ${auditType === "Cultural" ? "" : ""
            }`}
        >
          <input
            type="radio"
            name="auditType"
            value="Cultural"
            checked={auditType === "Cultural"}
            onChange={(e) => setAuditType(e.target.value as AuditType)}
            className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
          />
          <div className="flex-1">
            <Text
              variant="bodyMd"
              fontWeight="semibold"
              className="text-gray-900 mb-2"
            >
              Cultural Evaluation
            </Text>
            <Text
              variant="bodySm"
              className="text-gray-600 block"
            >
              Expert checks for real-world fit
            </Text>
          </div>
        </label>
      </div>

      {/* Audit Configuration Form - Show when Technical, Domain, or Cultural Audit is selected */}
      {(auditType === "Technical" || auditType === "Domain" || auditType === "Cultural") && (
        <div className={`${styles.auditConfigForm} mt-8`}>
          {/* Auditor Information Section */}
          {/* <div className="mb-6">
            <div className="flex gap-6 flex-wrap">
              <div className={`flex-1 min-w-[300px] ${styles.auditorNameWrapper}`}>
                <Label
                  htmlFor="auditorName"
                  className={`${styles.auditFormLabel} ${styles.auditorNameLabel}`}
                >
                  <Text variant="bodyMd" fontWeight="medium">
                    Expert name<span className="text-red-500">*</span>
                  </Text>
                </Label>
                <div
                  className={`${styles.auditFormTextfield} ${styles.auditorNameTextfield} ${auditorName ? "hasValue" : ""}`}
                >
                  <TextField
                    id="auditorName"
                    name="auditorName"
                    label="Auditor name"
                    labelHidden
                    value={auditorName}
                    onChange={(value) => {
                      setAuditorName(value);
                      if (setValidationErrors && validationErrors.auditorName) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          auditorName: undefined,
                        }));
                      }
                    }}
                    error={validationErrors.auditorName}
                    disabled={true}
                  />
                </div>
              </div>
              <div className={`flex-1 min-w-[300px] ${styles.organisationNameWrapper} ml-12`}>
                <Label
                  htmlFor="organisationName"
                  className={`${styles.auditFormLabel} ${styles.organisationNameLabel}`}
                >
                  <Text variant="bodyMd" fontWeight="medium">
                    Organisation Name<span className="text-red-500">*</span>
                  </Text>
                </Label>
                <div
                  className={`${styles.auditFormTextfield} ${styles.organisationNameTextfield} ${organisationName ? "hasValue" : ""}`}
                >
                  <TextField
                    id="organisationName"
                    name="organisationName"
                    label="Organisation Name"
                    labelHidden
                    value={organisationName}
                    disabled={organisationName ? true : false}
                    onChange={(value) => {
                      setOrganisationName(value);
                      if (
                        setValidationErrors &&
                        validationErrors.organisationName
                      ) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          organisationName: undefined,
                        }));
                      }
                    }}
                    error={validationErrors.organisationName}
                  />
                </div>
              </div>
            </div>
          </div> */}

          {evaluationScopeOptions.length > 0 && (
            <div className="mb-6">
              <Label
                htmlFor="auditScope"
                className={`${styles.auditFormLabel} ${styles.auditObjectiveLabel}`}
              >
                <Text variant="bodyMd" fontWeight="medium">
                  Evaluation Scope<span className="text-red-500">*</span>
                </Text>
              </Label>
              {validationErrors.auditScope && (
                <Text
                  variant="bodySm"
                  className="text-red-600 mt-1"
                  color="critical"
                >
                  {validationErrors.auditScope}
                </Text>
              )}
              <div className="mt-4">
                <div
                  className={`${styles.evaluationModuleDropdown} ${styles.modeOfEvaluationDropdown}`}
                >
                  <Select
                    name="auditScope"
                    label="Evaluation Scope"
                    labelHidden
                    options={evaluationScopeOptions}
                    value={auditScope}
                    placeholder="Select evaluation scope"
                    onChange={(value) => {
                      setAuditScope(value);

                      if (setValidationErrors && validationErrors.auditScope) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          auditScope: undefined,
                        }));
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Audit Details Section */}
          <div className="mb-6">
            <div className="flex flex-col gap-6">
              <div>
                <Label
                  htmlFor="auditObjective"
                  className={`${styles.auditFormLabel} ${styles.auditObjectiveLabel}`}
                >
                  <Text variant="bodyMd" fontWeight="medium">
                    Evaluation Objective<span className="text-red-500">*</span>
                  </Text>
                </Label>
                <div className={`${styles.auditFormTextarea} ${styles.auditObjectiveTextarea}`}>
                  <TextField
                    id="auditObjective"
                    name="auditObjective"
                    label="Audit Objective"
                    labelHidden
                    multiline={4}
                    value={auditObjective}
                    onChange={(value) => {
                      setAuditObjective(value);
                      if (
                        setValidationErrors &&
                        validationErrors.auditObjective
                      ) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          auditObjective: undefined,
                        }));
                      }
                    }}
                    error={validationErrors.auditObjective}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Evaluation Modules Section */}
          <div className="mb-6">
            <Label className={`${styles.auditFormLabel} ${styles.evaluationModulesLabel}`}>
              <Text variant="bodyMd" fontWeight="medium">
                Evaluation Modules<span className="text-red-500">*</span>
              </Text>
            </Label>
            {validationErrors.modules && (
              <Text
                variant="bodySm"
                className="text-red-600 mt-1"
                color="critical"
              >
                {validationErrors.modules}
              </Text>
            )}
            {validationErrors.metrics && (
              <Text
                variant="bodySm"
                className="text-red-600 mt-1"
                color="critical"
              >
                {validationErrors.metrics}
              </Text>
            )}
            {isLoadingModules ? (
              <div className="mt-4 flex flex-col items-center gap-4">
                <Spinner />
                <Text variant="bodySm" className="text-gray-600">
                  Loading modules...
                </Text>
              </div>
            ) : modulesError ? (
              <div className="mt-4">
                <Text variant="bodySm" className="text-red-600">
                  {modulesError}
                </Text>
              </div>
            ) : modules.length === 0 ? (
              <div className="mt-4">
                <Text variant="bodySm" className="text-gray-600">
                  No modules available for this model type.
                </Text>
              </div>
            ) : (
              <div className={`flex flex-row gap-4 mt-4 ${styles.evaluationModulesRow}`}>
                {modules
                  .filter((module) => module?.name)
                  .map((module) => {
                    const moduleKey = module.name;
                    const isSelected = selectedModules[moduleKey] || false;
                    const selectedMetric = selectedMetrics[moduleKey] || [];

                    // Get metrics options for this module - use fetched metrics if available, otherwise use module data
                    const metricOptions: SelectOption[] =
                      moduleMetricsOptions[moduleKey]?.length > 0
                        ? moduleMetricsOptions[moduleKey]
                        : Array.isArray(module.metrics)
                          ? module.metrics
                            .map((metric) => ({
                              value: metric?.name || "",
                              label:
                                metric?.displayName ||
                                toTitleCase(
                                  (metric?.name || "").replace(/_/g, " ")
                                ),
                            }))
                            .filter((opt) => opt.value) // Filter out invalid options
                          : [];
                    return (
                      <div
                        key={moduleKey}
                        className={`flex flex-col gap-2 ${styles.evaluationModuleWrapper}`}
                      >
                        <label className={styles.evaluationModuleCard}>
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={async (e) => {
                                const isChecked = e.target.checked;
                                setSelectedModules((prev) => ({
                                  ...prev,
                                  [moduleKey]: isChecked,
                                }));

                                // Clear validation errors when module selection changes
                                if (setValidationErrors) {
                                  setValidationErrors((prev) => ({
                                    ...prev,
                                    modules: undefined,
                                    metrics: undefined,
                                  }));
                                }

                                if (isChecked) {
                                  // When module is selected, default to all available metrics for that module
                                  const optionsToSelect =
                                    moduleMetricsOptions[moduleKey]?.length > 0
                                      ? moduleMetricsOptions[moduleKey]
                                      : metricOptions;

                                  if (optionsToSelect.length > 0) {
                                    setSelectedMetrics((prev) => ({
                                      ...prev,
                                      [moduleKey]: optionsToSelect,
                                    }));
                                  }

                                  // If module has no metrics in its data, fetch from API
                                  if (
                                    (!module.metrics ||
                                      module.metrics.length === 0) &&
                                    !moduleMetricsOptions[moduleKey]
                                  ) {
                                    const fetchedMetrics =
                                      await fetchMetricsForModule(moduleKey);
                                    if (fetchedMetrics.length > 0) {
                                      setModuleMetricsOptions((prev) => ({
                                        ...prev,
                                        [moduleKey]: fetchedMetrics,
                                      }));
                                      setSelectedMetrics((prev) => ({
                                        ...prev,
                                        [moduleKey]: fetchedMetrics,
                                      }));
                                    }
                                  }
                                } else {
                                  // Clear selected metric when module is unchecked
                                  setSelectedMetrics((prev) => {
                                    const updated = { ...prev };
                                    delete updated[moduleKey];
                                    return updated;
                                  });
                                }
                              }}
                              className={styles.evaluationModuleCheckbox}
                            />
                            <div className="flex-1 flex flex-col">
                              <Text
                                variant="bodyMd"
                                fontWeight="semibold"
                                className="text-gray-900 mb-1"
                              >
                                {getModuleDisplayName(moduleKey)}
                              </Text>
                              <Text variant="bodySm" className="text-gray-600">
                                {module.description ||
                                  module.displayName ||
                                  "No description available"}
                              </Text>
                            </div>
                          </div>
                        </label>
                        {isSelected && (
                          <div className={styles.evaluationModuleDropdown}>
                            <Combobox
                              name={`${moduleKey}-metrics`}
                              label="Select sub-modules from dropdown"
                              labelHidden
                              list={metricOptions}
                              selectedValue={selectedMetric}
                              placeholder={formatSelectedMetrics(
                                selectedMetric
                              )}
                              onChange={async (value) => {
                                const nextSelected = Array.isArray(value)
                                  ? value
                                  : metricOptions.filter(
                                    (option) => option.value === value
                                  );

                                setSelectedMetrics((prev) => ({
                                  ...prev,
                                  [moduleKey]: nextSelected,
                                }));

                                // Clear validation errors when metrics change
                                if (setValidationErrors) {
                                  setValidationErrors((prev) => ({
                                    ...prev,
                                    metrics: undefined,
                                  }));
                                }
                                // If no metrics in module data, try fetching from API
                                if (
                                  metricOptions.length === 0 &&
                                  value &&
                                  !moduleMetricsOptions[moduleKey]
                                ) {
                                  const fetchedMetrics =
                                    await fetchMetricsForModule(moduleKey);
                                  if (fetchedMetrics.length > 0) {
                                    setModuleMetricsOptions((prev) => ({
                                      ...prev,
                                      [moduleKey]: fetchedMetrics,
                                    }));
                                    setSelectedMetrics((prev) => ({
                                      ...prev,
                                      [moduleKey]: fetchedMetrics,
                                    }));
                                  }
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Mode of Evaluation Section */}
          <div className="mb-6 mt-6">
            <Label className={`${styles.auditFormLabel} ${styles.evaluationModulesLabel}`}>
              <Text variant="bodyMd" fontWeight="medium">
                Mode of Evaluation<span className="text-red-500">*</span>
              </Text>
            </Label>
            <div className="mt-4">
              <div className={`${styles.evaluationModuleDropdown} ${styles.modeOfEvaluationDropdown}`}>
                <Select
                  name="modeOfEvaluation"
                  label="Mode of Evaluation"
                  labelHidden
                  options={modeOfEvaluationOptions}
                  value={modeOfEvaluation}
                  className={
                    auditType === "Domain" || auditType === "Cultural"
                      ? "mode-of-evaluation-select-disabled"
                      : undefined
                  }
                  onChange={(value) => {
                    setModeOfEvaluation(value);
                    if (
                      setValidationErrors &&
                      validationErrors.modeOfEvaluation
                    ) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        modeOfEvaluation: undefined,
                      }));
                    }
                  }}
                  placeholder="Click to select from dropdown"
                  error={validationErrors.modeOfEvaluation}
                  disabled={auditType === "Domain" || auditType === "Cultural"}
                />
              </div>
            </div>
            {(auditType === "Domain" || auditType === "Cultural") && (
              <Text
                variant="bodySm"
                className="mt-2"
                style={{ color: "#60646C" }}
              >
                Only Manual Mode for Domain and Cultural Evaluations
              </Text>
            )}
            {validationErrors.modeOfEvaluation && (
              <Text
                variant="bodySm"
                className="text-red-600 mt-1"
                color="critical"
              >
                {validationErrors.modeOfEvaluation}
              </Text>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationConfiguration;
