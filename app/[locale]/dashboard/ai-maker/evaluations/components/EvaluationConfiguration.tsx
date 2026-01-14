"use client";

import React from "react";
import { Text, TextField, Label, Select, Combobox } from "opub-ui";
import type { SelectOption } from "./types";

type AuditType = "technical" | "domain" | "cultural";

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
  scopeOfAudit: string;
  setScopeOfAudit: (value: string) => void;
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
    scopeOfAudit?: string;
    modeOfEvaluation?: string;
    modules?: string;
    metrics?: string;
  };
  setValidationErrors?: React.Dispatch<
    React.SetStateAction<{
      auditorName?: string;
      organisationName?: string;
      auditObjective?: string;
      scopeOfAudit?: string;
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
  scopeOfAudit,
  setScopeOfAudit,
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
      <Label htmlFor="auditType" className="block audit-type-label">
        <Text variant="bodyMd" fontWeight="medium">
          Evaluation Type <span className="text-red-500">*</span>
        </Text>
      </Label>

      <div className="flex gap-4 audit-options-container">
        {/* Technical Audit Option */}
        <label
          className={`flex items-start gap-3 cursor-pointer transition-all technical-audit-card ${
            auditType === "technical" ? "" : ""
          }`}
        >
          <input
            type="radio"
            name="auditType"
            value="technical"
            checked={auditType === "technical"}
            onChange={(e) => setAuditType(e.target.value as AuditType)}
            className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
          />
          <div className="flex-1">
            <Text
              variant="bodyMd"
              fontWeight="semibold"
              className="text-gray-900 mb-2 whitespace-nowrap"
            >
              Technical Evaluation
            </Text>
            <Text
              variant="bodySm"
              className="text-gray-600 block whitespace-nowrap"
            >
              Check performance, safety, drift
            </Text>
          </div>
        </label>

        {/* Domain Audit Option */}
        <label
          className={`flex items-start gap-3 cursor-pointer transition-all domain-audit-card ${
            auditType === "domain" ? "" : ""
          }`}
        >
          <input
            type="radio"
            name="auditType"
            value="domain"
            checked={auditType === "domain"}
            onChange={(e) => setAuditType(e.target.value as AuditType)}
            className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
          />
          <div className="flex-1">
            <Text
              variant="bodyMd"
              fontWeight="semibold"
              className="text-gray-900 mb-2 whitespace-nowrap"
            >
              Domain Evaluation
            </Text>
            <Text
              variant="bodySm"
              className="text-gray-600 block whitespace-nowrap"
            >
              Check accuracy within domain context
            </Text>
          </div>
        </label>

        {/* Cultural Audit Option */}
        <label
          className={`flex items-start gap-3 cursor-pointer transition-all cultural-audit-card ${
            auditType === "cultural" ? "" : ""
          }`}
        >
          <input
            type="radio"
            name="auditType"
            value="cultural"
            checked={auditType === "cultural"}
            onChange={(e) => setAuditType(e.target.value as AuditType)}
            className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
          />
          <div className="flex-1">
            <Text
              variant="bodyMd"
              fontWeight="semibold"
              className="text-gray-900 mb-2 whitespace-nowrap"
            >
              Cultural Evaluation
            </Text>
            <Text
              variant="bodySm"
              className="text-gray-600 block whitespace-nowrap"
            >
              Expert checks for real-world fit
            </Text>
          </div>
        </label>
      </div>

      {/* Audit Configuration Form - Show when Technical Audit is selected */}
      {auditType === "technical" && (
        <div className="audit-config-form mt-8">
          {/* Auditor Information Section */}
          <div className="mb-6">
            <div className="flex gap-6 flex-wrap">
              <div className="flex-1 min-w-[300px] auditor-name-wrapper">
                <Label
                  htmlFor="auditorName"
                  className="audit-form-label auditor-name-label"
                >
                  <Text variant="bodyMd" fontWeight="medium">
                    Expert name<span className="text-red-500">*</span>
                  </Text>
                </Label>
                <div
                  className={`audit-form-textfield auditor-name-textfield ${auditorName ? "has-value" : ""}`}
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
              <div className="flex-1 min-w-[300px] organisation-name-wrapper ml-12">
                <Label
                  htmlFor="organisationName"
                  className="audit-form-label organisation-name-label"
                >
                  <Text variant="bodyMd" fontWeight="medium">
                    Organisation Name<span className="text-red-500">*</span>
                  </Text>
                </Label>
                <div
                  className={`audit-form-textfield organisation-name-textfield ${organisationName ? "has-value" : ""}`}
                >
                  <TextField
                    id="organisationName"
                    name="organisationName"
                    label="Organisation Name"
                    labelHidden
                    value={organisationName}
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
          </div>

          {/* Audit Details Section */}
          <div className="mb-6">
            <div className="flex flex-col gap-6">
              <div>
                <Label
                  htmlFor="auditObjective"
                  className="audit-form-label audit-objective-label"
                >
                  <Text variant="bodyMd" fontWeight="medium">
                    Evaluation Objective<span className="text-red-500">*</span>
                  </Text>
                </Label>
                <div className="audit-form-textarea audit-objective-textarea">
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
              <div>
                <Label
                  htmlFor="scopeOfAudit"
                  className="audit-form-label scope-of-audit-label"
                >
                  <Text variant="bodyMd" fontWeight="medium">
                    Scope of Evaluation<span className="text-red-500">*</span>
                  </Text>
                </Label>
                <div className="audit-form-textarea scope-of-audit-textarea">
                  <TextField
                    id="scopeOfAudit"
                    name="scopeOfAudit"
                    label="Scope of Audit"
                    labelHidden
                    multiline={4}
                    value={scopeOfAudit}
                    onChange={(value) => {
                      setScopeOfAudit(value);
                      if (
                        setValidationErrors &&
                        validationErrors.scopeOfAudit
                      ) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          scopeOfAudit: undefined,
                        }));
                      }
                    }}
                    error={validationErrors.scopeOfAudit}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Evaluation Modules Section */}
          <div className="mb-6">
            <Label className="audit-form-label evaluation-modules-label">
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
              <div className="mt-4">
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
              <div className="flex flex-row gap-4 mt-4 evaluation-modules-row">
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
                        className="flex flex-col gap-2 evaluation-module-wrapper"
                      >
                        <label className="evaluation-module-card">
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
                              className="evaluation-module-checkbox"
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
                          <div className="evaluation-module-dropdown ">
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
            <Label className="audit-form-label evaluation-modules-label">
              <Text variant="bodyMd" fontWeight="medium">
                Mode of Evaluation<span className="text-red-500">*</span>
              </Text>
            </Label>
            <div className="mt-4">
              <div className="evaluation-module-dropdown mode-of-evaluation-dropdown">
                <Select
                  name="modeOfEvaluation"
                  label="Mode of Evaluation"
                  labelHidden
                  options={modeOfEvaluationOptions}
                  value={modeOfEvaluation}
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
                />
              </div>
            </div>
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
