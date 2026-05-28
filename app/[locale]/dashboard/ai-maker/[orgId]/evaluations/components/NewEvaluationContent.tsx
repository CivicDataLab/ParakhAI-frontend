"use client";

import { useGraphQL } from "@/lib/api";
import { useAppSession } from "@/lib/session";
import { toTitleCase } from "@/lib/utils";
import { IconArrowLeft, IconTrash } from "@tabler/icons-react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Icon,
  Label,
  Select,
  Spinner,
  Tag,
  Text,
  TextField,
} from "opub-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOrganization } from "../../OrganizationContext";
import EvaluationConfiguration from "./EvaluationConfiguration";
import { GET_EVALUATION_STATUS_QUERY } from "./manual-evaluation/queries";
import type { ManualEvaluationStatus } from "./manual-evaluation/types";
import { getTotalManualTestCaseCount } from "./manual-evaluation/utils";
import ManualTestCases from "./ManualTestCases";
import ModelSelectionModal from "./ModelSelectionModal";
import styles from "./styles.module.scss";
import TestCases from "./TestCases";
import type { AuditType, Module, SelectOption } from "./types";

// GraphQL queries for dynamic modules and metrics
const MODULES_BY_MODEL_TYPE_QUERY = `
  query GetModulesByModelType($modelType: String!) {
  modulesByModelType(modelType: $modelType) {
    name
    displayName
  }
}
`;

const METRICS_BY_MODEL_TYPE_QUERY = `
  query MetricsByModelType($modelType: String!) {
    metricsByModelType(modelType: $modelType) {
      name
      displayName
      description
      metrics {
        name
        displayName
        description
      }
    }
  }
`;

// GraphQL query to fetch AI models with their versions
const AI_MODELS_QUERY = `
  query GetAIModels(
    $status: String
    $modelType: String
    $provider: String
    $isPublic: Boolean
    $limit: Int
    $offset: Int
  ) {
    aiModels(
      status: $status
      modelType: $modelType
      provider: $provider
      isPublic: $isPublic
      limit: $limit
      offset: $offset
    ) {
      id
      name
      displayName
      modelType
      domain
      isPublic
      versions {
        id
        version
        isLatest
        status
      }
    }
  }
`;

// Query to fetch a single AI model by ID
const AI_MODEL_BY_ID_QUERY = `
  query GetAIModel($modelId: ID!) {
    aiModel(modelId: $modelId) {
      id
      name
      displayName
      modelType
      domain
      versions {
        id
        version
        isLatest
        status
      }
    }
  }
`;

const AUDIT_DOMAIN_OPTIONS_QUERY = `
  query AuditDomainOptions($domain: String!) {
    auditDomainOptions(domain: $domain) {
      domains
    }
  }
`;

// Query to fetch audit details by ID
const GET_AUDIT_QUERY = `
  query GetAudit($auditId: ID!) {
    audit(auditId: $auditId) {
      id
      name
      status
      auditType
      evaluationMode
      auditObjective
      auditScope
      modelId
      modelVersionId
      modelName
      modules
      metrics
      testDatasetIds
      configuration
    }
  }
`;

// Mutation to create a blank audit (early in the flow)
const CREATE_BLANK_AUDIT_MUTATION = `
  mutation CreateBlankAudit($input: CreateBlankAuditInput!) {
    createBlankAudit(input: $input) {
      success
      message
      audit {
        id
        name
        status
        modelId
        modelVersionId
      }
    }
  }
`;

// Mutation to update an existing audit
const UPDATE_AUDIT_MUTATION = `
  mutation UpdateAudit($input: UpdateAuditInput!) {
    updateAudit(input: $input) {
      success
      message
      audit {
        id
        name
        status
        modules
        auditScope
        metrics
        modelId
        modelVersionId
        testDatasetIds
        configuration
      }
    }
  }
`;

// Mutation to run/execute an audit
const RUN_AUDIT_MUTATION = `
  mutation RunAudit($input: RunAuditInput!) {
    runAudit(input: $input) {
      success
      message
      audit {
        id
        name
        status
        modules
        metrics
        modelId
        modelVersionId
        testDatasetIds
        configuration
        judgeModel
        judgeConfig
        errorMessage
        errorDetails
        totalTests
        passedTests
        failedTests
        skippedTests
      }
    }
  }
`;

// Legacy mutation - kept for backward compatibility
const REQUEST_AUDIT_MUTATION = `
  mutation RequestAudit($input: RequestAuditInput!) {
    requestAudit(input: $input) {
      success
      message
      audit {
        id
        name
        status
        modules
        metrics
        modelId
        modelVersionId
        testDatasetIds
        configuration
        judgeModel
        judgeConfig
        errorMessage
        errorDetails
        totalTests
        passedTests
        failedTests
        skippedTests
      }
    }
  }
`;

const generateDefaultAuditName = () => {
  const now = new Date();

  const day = now.getDate();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();

  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const timeString = `${hours}:${minutes}${ampm}`;

  return `Untitled Evaluation - ${day} ${month} ${year} - ${timeString}`;
};

/** Map API / config auditType values to UI AuditType; null if unknown. */
function parseAuditTypeFromBackend(
  raw: string | null | undefined
): AuditType | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (
    trimmed === "Technical" ||
    trimmed === "Domain" ||
    trimmed === "Cultural"
  ) {
    return trimmed;
  }
  const norm = trimmed.toUpperCase().replace(/[\s-]+/g, "_");
  const byEnum: Record<string, AuditType> = {
    TECHNICAL_AUDIT: "Technical",
    DOMAIN_AUDIT: "Domain",
    CULTURAL_AUDIT: "Cultural",
    TECHNICAL: "Technical",
    DOMAIN: "Domain",
    CULTURAL: "Cultural",
  };
  if (byEnum[norm]) return byEnum[norm];
  if (norm.includes("TECHNICAL")) return "Technical";
  if (norm.includes("CULTURAL")) return "Cultural";
  if (norm.includes("DOMAIN")) return "Domain";
  return null;
}

interface NewEvaluationContentProps {
  orgId: string;
  fromAuditor?: boolean;
}

const NewEvaluationContent: React.FC<NewEvaluationContentProps> = ({
  orgId,
  fromAuditor = false,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";

  const evaluationsListPath = fromAuditor
    ? `/${locale}/dashboard/auditor/evaluations`
    : `/${locale}/dashboard/ai-maker/${orgId}/evaluations`;

  const urlModelId = searchParams.get("modelId");
  const urlVersion = searchParams.get("version");
  const urlVersionId = searchParams.get("versionId");
  const urlAuditId = searchParams.get("auditId");

  const [auditType, setAuditType] = useState<AuditType>("Technical");
  const [activeTab, setActiveTab] = useState<"config" | "test">("config");
  const [auditName, setAuditName] = useState(generateDefaultAuditName);

  // Current audit ID - persisted in URL
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(
    urlAuditId
  );
  const [isCreatingAudit, setIsCreatingAudit] = useState(false);
  const [isSavingDraftBeforeExit, setIsSavingDraftBeforeExit] = useState(false);
  const [isLoadingAuditDetails, setIsLoadingAuditDetails] = useState(false);

  // AI Models state
  const [selectedModelId, setSelectedModelId] = useState<string | null>(
    urlModelId
  );
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(
    urlVersionId ? parseInt(urlVersionId) : null
  );
  const [aiModels, setAiModels] = useState<
    Array<{
      id: string;
      name: string;
      displayName: string;
      modelType: string;
      domain?: string | null | string[];
      organization?: string;
      versions?: Array<{
        id: number;
        version: string;
        isLatest: boolean;
        status: string;
      }>;
    }>
  >([]);
  const { organization } = useOrganization();
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [invalidModelError, setInvalidModelError] = useState<string | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [auditModelName, setAuditModelName] = useState<string | null>(null);
  const [auditModelVersion, setAuditModelVersion] = useState<string | null>(
    null
  );

  // Computed values from selected model
  const selectedModel = aiModels.find((m) => m.id === selectedModelId);
  const modelName =
    auditModelName || selectedModel?.displayName || selectedModel?.name || "";
  // Get version display from selected version or latest version
  const selectedVersion = selectedModel?.versions?.find(
    (v) => v.id === selectedVersionId
  );
  const latestVersion = selectedModel?.versions?.find((v) => v.isLatest);
  const modelVersion =
    auditModelVersion ||
    selectedVersion?.version ||
    latestVersion?.version ||
    "";
  const modelType = selectedModel?.modelType || "TEXT_GENERATION";

  const [evaluationScopeOptions, setEvaluationScopeOptions] = useState<
    SelectOption[]
  >([]);
  const evaluationScopeOptionsKey = evaluationScopeOptions
    .map((o) => o.value)
    .join("|");

  // GraphQL API hook for authenticated requests
  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
    accessToken,
  } = useGraphQL();

  // Get user session for expert name
  const { user } = useAppSession();

  // Keep auditScope aligned with the selected model's available domains
  useEffect(() => {
    if (evaluationScopeOptions.length === 0) {
      if (auditScope) setAuditScope("");
      return;
    }

    const exists = evaluationScopeOptions.some((o) => o.value === auditScope);
    if (!exists) {
      setAuditScope("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId, auditType, evaluationScopeOptionsKey]);

  // Resolve evaluation scope options via:
  // 1) GetAIModel -> domain
  // 2) auditDomainOptions(domain) -> domains[]
  useEffect(() => {
    const fetchAuditDomainOptions = async () => {
      if (!selectedModelId || !isAuthenticated || isSessionLoading) return;

      try {
        const modelResult = await request<{
          aiModel: {
            id: string;
            domain?: string | string[] | null;
          } | null;
        }>(
          AI_MODEL_BY_ID_QUERY,
          { modelId: selectedModelId },
          { organization: orgId }
        );

        const modelDomain = modelResult?.aiModel?.domain;
        const domainInput = Array.isArray(modelDomain)
          ? modelDomain.find(Boolean) || ""
          : modelDomain || "";

        if (!domainInput) {
          setEvaluationScopeOptions([]);
          return;
        }

        const domainOptionsResult = await request<{
          auditDomainOptions: { domains?: any[] | null } | null;
        }>(
          AUDIT_DOMAIN_OPTIONS_QUERY,
          { domain: domainInput },
          { organization: orgId }
        );

        const domains = domainOptionsResult?.auditDomainOptions?.domains || [];
        const options: SelectOption[] = [];

        domains.filter(Boolean).forEach((domainEntry) => {
          let value: string;
          let label: string;

          if (typeof domainEntry === "string") {
            value = domainEntry;
            label = domainEntry;
          } else if (typeof domainEntry === "object" && domainEntry !== null) {
            const entries = Object.entries(domainEntry as Record<string, any>);
            if (entries.length > 0) {
              const [backendValue, backendLabel] = entries[0];
              const resolvedLabel =
                backendLabel !== undefined && backendLabel !== null
                  ? String(backendLabel)
                  : String(backendValue);

              // Use backend key as value, human‑readable text as label
              value = String(backendValue);
              label = resolvedLabel;
            } else {
              const fallback = JSON.stringify(domainEntry);
              value = fallback;
              label = fallback;
            }
          } else {
            const fallback = String(domainEntry);
            value = fallback;
            label = fallback;
          }

          if (!options.some((opt) => opt.value === value)) {
            options.push({ value, label });
          }
        });

        setEvaluationScopeOptions(options);
      } catch {
        setEvaluationScopeOptions([]);
      }
    };

    fetchAuditDomainOptions();
  }, [selectedModelId, isAuthenticated, isSessionLoading, request, orgId]);

  // Handle tab query parameter on mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "config" || tabParam === "test") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Form state (no default filled values)
  const [auditorName, setAuditorName] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [auditObjective, setAuditObjective] = useState("");
  const [modeOfEvaluation, setModeOfEvaluation] = useState<string>("");
  const [hasManualTestCases, setHasManualTestCases] = useState(false);
  const [auditScope, setAuditScope] = useState<string>("");

  // Prefill organisation name when org details are loaded
  useEffect(() => {
    if (organization?.name && !organisationName) {
      setOrganisationName(organization.name);
    }
  }, [organization?.name, organisationName]);

  // Automatically set mode of evaluation to "manual" when domain or cultural evaluation is selected
  useEffect(() => {
    if (
      (auditType === "Domain" || auditType === "Cultural") &&
      modeOfEvaluation !== "manual"
    ) {
      setModeOfEvaluation("manual");
    }
  }, [auditType, modeOfEvaluation]);

  const handleManualTestCaseCountChange = useCallback((count: number) => {
    setHasManualTestCases(count > 0);
  }, []);

  useEffect(() => {
    if (!currentAuditId || modeOfEvaluation !== "manual") {
      setHasManualTestCases(false);
      return;
    }

    let cancelled = false;

    const syncManualTestCaseCount = async () => {
      try {
        const result = await request<{
          manualEvaluationStatus: ManualEvaluationStatus;
        }>(
          GET_EVALUATION_STATUS_QUERY,
          { auditId: currentAuditId },
          { organization: orgId }
        );

        if (!cancelled) {
          setHasManualTestCases(
            getTotalManualTestCaseCount(
              result?.manualEvaluationStatus?.moduleProgress
            ) > 0
          );
        }
      } catch (err) {
        console.error("Error syncing manual test case count:", err);
      }
    };

    syncManualTestCaseCount();

    return () => {
      cancelled = true;
    };
  }, [currentAuditId, modeOfEvaluation, orgId, request]);

  // Set auditor name from session when user is available
  useEffect(() => {
    if (user?.name && !auditorName) {
      setAuditorName(user.name);
    }
  }, [user?.name, auditorName]);

  // Dynamic modules state - stores modules fetched from API
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<
    Record<string, boolean>
  >({});
  const [selectedMetrics, setSelectedMetrics] = useState<
    Record<string, SelectOption[]>
  >({});
  const [moduleMetricsOptions, setModuleMetricsOptions] = useState<
    Record<string, SelectOption[]>
  >({});
  const [isLoadingModules, setIsLoadingModules] = useState<boolean>(false);
  const [modulesError, setModulesError] = useState<string | null>(null);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<{
    auditorName?: string;
    organisationName?: string;
    auditObjective?: string;
    auditScope?: string;
    modeOfEvaluation?: string;
    modules?: string;
    metrics?: string;
  }>({});

  // Test Cases state
  const [selectedPromptLibraries, setSelectedPromptLibraries] = useState<any[]>(
    []
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [pastedTestCases, setPastedTestCases] = useState("");
  const [testInputMode, setTestInputMode] = useState<"paste" | "upload">(
    "paste"
  );

  // Backend audit run state
  const [isRequestingAudit, setIsRequestingAudit] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditOverview, setAuditOverview] = useState<{
    auditId: string | null;
    auditTime: string | null;
    durationSeconds: number | null;
  } | null>(null);
  const lastSavedDraftSnapshotRef = useRef<string>("");
  const hasUnsavedDraftChangesRef = useRef(false);
  const isNavigatingAwayRef = useRef(false);
  const hasInitializedSavedSnapshotRef = useRef(false);
  const hasTriggeredLeaveAutosaveRef = useRef(false);

  const getPromptDatasetStorageKey = (auditId: string) =>
    `evaluation-draft-datasets:${orgId}:${auditId}`;

  const getDraftSnapshot = () => {
    const selectedModuleNames = Object.entries(selectedModules)
      .filter(([, isSelected]) => isSelected)
      .map(([moduleName]) => moduleName)
      .sort();

    const selectedMetricsMap = Object.entries(selectedMetrics)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce(
        (acc, [moduleName, metrics]) => {
          acc[moduleName] = (metrics || [])
            .map((metric) => metric.value)
            .sort();
          return acc;
        },
        {} as Record<string, string[]>
      );

    return JSON.stringify({
      auditName: auditName.trim(),
      auditType,
      selectedModelId: selectedModelId || "",
      selectedVersionId: selectedVersionId || null,
      auditorName: auditorName.trim(),
      organisationName: organisationName.trim(),
      auditObjective: auditObjective.trim(),
      modeOfEvaluation: modeOfEvaluation || "",
      auditScope: auditScope.trim(),
      selectedModules: selectedModuleNames,
      selectedMetrics: selectedMetricsMap,
      selectedPromptLibraries: selectedPromptLibraries
        .map((item: any) => item?.id)
        .filter(Boolean)
        .sort(),
      testInputMode,
      pastedTestCases: pastedTestCases.trim(),
      uploadedFiles: uploadedFiles.map((file) => file.name).sort(),
    });
  };

  const hasDraftProgress = () =>
    Boolean(
      currentAuditId ||
        selectedModelId ||
        auditObjective.trim() ||
        auditScope.trim() ||
        auditorName.trim() ||
        organisationName.trim() ||
        pastedTestCases.trim() ||
        uploadedFiles.length ||
        selectedPromptLibraries.length ||
        Object.values(selectedModules).some(Boolean)
    );

  // Fetch audit details when auditId is in URL
  useEffect(() => {
    const fetchAuditDetails = async () => {
      if (!urlAuditId || !isAuthenticated || isSessionLoading) return;

      setIsLoadingAuditDetails(true);
      try {
        const result = await request<{
          audit: {
            id: string;
            name: string;
            status: string;
            auditType: string;
            evaluationMode: string;
            auditObjective: string | null;
            auditScope: string | null;
            modelId: string;
            modelVersionId: number | null;
            modelName: string | null;
            modules: string[];
            metrics: string[];
            testDatasetIds: string[];
            configuration: any;
          } | null;
        }>(GET_AUDIT_QUERY, { auditId: urlAuditId }, { organization: orgId });

        const audit = result?.audit;
        if (audit) {
          setAuditName(audit.name || generateDefaultAuditName());
          setSelectedModelId(audit.modelId);
          setSelectedVersionId(audit.modelVersionId);

          // Fetch model details to get proper name and version
          if (audit.modelId) {
            try {
              const modelResult = await request<{
                aiModel: {
                  id: string;
                  name: string;
                  displayName: string;
                  modelType: string;
                  versions: Array<{
                    id: number;
                    version: string;
                    isLatest: boolean;
                    status: string;
                  }>;
                } | null;
              }>(
                AI_MODEL_BY_ID_QUERY,
                { modelId: audit.modelId },
                { organization: orgId }
              );

              if (modelResult?.aiModel) {
                const model = modelResult.aiModel;
                setAuditModelName(model.displayName || model.name);

                // Find the version string for the selected version
                if (audit.modelVersionId && model.versions) {
                  const version = model.versions.find(
                    (v) => v.id === audit.modelVersionId
                  );
                  if (version) {
                    setAuditModelVersion(version.version);
                  }
                }

                // Add the model to aiModels so version info is available
                setAiModels((prev) => {
                  const exists = prev.find((m) => m.id === model.id);
                  if (exists) return prev;
                  return [...prev, model];
                });

                // Fetch all modules and metrics for this model type using MetricsByModelType
                try {
                  const metricsResp = await request<{
                    metricsByModelType: Array<{
                      name: string;
                      displayName?: string;
                      description?: string;
                      metrics: Array<{
                        name: string;
                        displayName?: string;
                        description?: string;
                      }>;
                    }>;
                  }>(METRICS_BY_MODEL_TYPE_QUERY, {
                    modelType: model.modelType,
                  });

                  const metricsData = metricsResp?.metricsByModelType || [];

                  // Convert to Module format and set all modules
                  const allModules: Module[] = metricsData.map(
                    (moduleData: any) => ({
                      name: moduleData.name,
                      displayName:
                        moduleData.displayName ||
                        toTitleCase(moduleData.name.replace(/_/g, " ")),
                      description: moduleData.description || "",
                      metrics: (moduleData.metrics || []).map(
                        (metric: any) => ({
                          name: metric.name,
                          displayName:
                            metric.displayName ||
                            toTitleCase(metric.name.replace(/_/g, " ")),
                          description: metric.description || "",
                        })
                      ),
                    })
                  );

                  setModules(allModules);

                  // Build module metrics options from the fetched data
                  const moduleMetricsOptionsMap: Record<
                    string,
                    SelectOption[]
                  > = {};
                  metricsData.forEach((moduleMetrics: any) => {
                    if (
                      moduleMetrics?.name &&
                      Array.isArray(moduleMetrics.metrics) &&
                      moduleMetrics.metrics.length > 0
                    ) {
                      const metricsOptions = moduleMetrics.metrics.map(
                        (metric: any) => ({
                          value: metric.name,
                          label:
                            metric.displayName ||
                            toTitleCase(metric.name.replace(/_/g, " ")),
                        })
                      );
                      moduleMetricsOptionsMap[moduleMetrics.name] =
                        metricsOptions;
                    }
                  });
                  setModuleMetricsOptions(moduleMetricsOptionsMap);

                  // Now set selected modules and metrics based on draft data
                  if (audit.modules && audit.modules.length > 0) {
                    const modulesMap: Record<string, boolean> = {};
                    audit.modules.forEach((mod: string) => {
                      modulesMap[mod] = true;
                    });
                    setSelectedModules(modulesMap);

                    // Set selected metrics based on draft data
                    if (audit.metrics && audit.metrics.length > 0) {
                      const selectedMetricsMap: Record<string, SelectOption[]> =
                        {};

                      // For each selected module, find matching metrics from draft
                      audit.modules.forEach((moduleName: string) => {
                        const moduleMetrics =
                          moduleMetricsOptionsMap[moduleName] || [];
                        // Filter metrics that exist in both draft and module's available metrics
                        const draftMetrics = audit.metrics.filter(
                          (metricName: string) =>
                            moduleMetrics.some(
                              (opt: SelectOption) => opt.value === metricName
                            )
                        );

                        if (draftMetrics.length > 0) {
                          selectedMetricsMap[moduleName] = moduleMetrics.filter(
                            (opt: SelectOption) =>
                              draftMetrics.includes(opt.value)
                          );
                        } else if (moduleMetrics.length > 0) {
                          // If no matching metrics found, select all available metrics for this module
                          selectedMetricsMap[moduleName] = moduleMetrics;
                        }
                      });

                      if (Object.keys(selectedMetricsMap).length > 0) {
                        setSelectedMetrics(selectedMetricsMap);
                      }
                    }
                  }

                  // Mark modules as fetched to prevent regular useEffect from overwriting draft selections
                  modulesFetchedRef.current = true;
                  isFetchingRef.current = false;
                  lastModelTypeRef.current = model.modelType;
                } catch (metricsError) {
                  console.warn(
                    "Failed to fetch modules/metrics for draft:",
                    metricsError
                  );
                  // Fallback to basic module construction if fetch fails
                  if (audit.modules && audit.modules.length > 0) {
                    const draftModules: Module[] = audit.modules.map(
                      (moduleName: string) => ({
                        name: moduleName,
                        displayName: toTitleCase(moduleName.replace(/_/g, " ")),
                        description: "",
                        metrics: [],
                      })
                    );
                    setModules(draftModules);

                    const modulesMap: Record<string, boolean> = {};
                    audit.modules.forEach((mod: string) => {
                      modulesMap[mod] = true;
                    });
                    setSelectedModules(modulesMap);
                  }
                }
              }
            } catch (modelError) {
              console.error("Error fetching model details:", modelError);
            }
          }

          if (audit.auditObjective) setAuditObjective(audit.auditObjective);
          if (audit.auditScope) setAuditScope(audit.auditScope);
          // If backend has no auditScope yet, keep the current default derived
          // from the selected model's domains instead of clearing it.
          if (audit.evaluationMode) {
            setModeOfEvaluation(audit.evaluationMode.toLowerCase());
          }

          const config = audit.configuration || {};

          const restoredAuditType =
            parseAuditTypeFromBackend(config.auditType) ??
            parseAuditTypeFromBackend(audit.auditType);
          if (restoredAuditType) {
            setAuditType(restoredAuditType);
          }
          if (config.auditorName) setAuditorName(config.auditorName);
          if (config.organisationName)
            setOrganisationName(config.organisationName);
          if (typeof config.testInputMode === "string") {
            const savedMode =
              config.testInputMode === "upload" ? "upload" : "paste";
            setTestInputMode(savedMode);
          }
          if (typeof config.pastedTestCases === "string") {
            setPastedTestCases(config.pastedTestCases);
          }
          let restoredDatasetIds: Array<string | number> = Array.isArray(
            audit.testDatasetIds
          )
            ? audit.testDatasetIds
            : Array.isArray(config.selectedPromptDatasetIds)
              ? config.selectedPromptDatasetIds
              : [];
          if (!restoredDatasetIds.length && typeof window !== "undefined") {
            const cached = window.localStorage.getItem(
              getPromptDatasetStorageKey(audit.id)
            );
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) {
                  restoredDatasetIds = parsed;
                }
              } catch {
                // Ignore invalid cache and continue.
              }
            }
          }
          if (restoredDatasetIds.length) {
            setSelectedPromptLibraries(
              restoredDatasetIds
                .map((item: any) => {
                  if (item && typeof item === "object") {
                    const possibleId = item.id ?? item.value;
                    return possibleId ? { id: String(possibleId) } : null;
                  }
                  return { id: String(item) };
                })
                .filter(Boolean) as any[]
            );
          }

          // Note: Modules and metrics are now loaded in the model fetch section above
          // using MetricsByModelType query to show all available modules
          // Only selected modules/metrics from draft are marked as selected
        }
      } catch (error) {
        console.error("Error fetching audit details:", error);
      } finally {
        setIsLoadingAuditDetails(false);
      }
    };

    fetchAuditDetails();
  }, [urlAuditId, isAuthenticated, isSessionLoading, orgId, request]);

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleTabChange = (tab: "config" | "test") => {
    setActiveTab(tab);
    scrollToTop();
  };

  // Update URL with audit ID without full page navigation
  const updateUrlWithAuditId = (auditId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("auditId", auditId);
    window.history.replaceState({}, "", url.toString());
  };

  // Create a blank audit when model is selected
  const createBlankAudit = async (
    modelId: string,
    versionId: number | null
  ): Promise<string | null> => {
    if (isCreatingAudit) return null;

    setIsCreatingAudit(true);
    setAuditError(null);

    try {
      const result = await request<{
        createBlankAudit: { success: boolean; message: string; audit: any };
      }>(
        CREATE_BLANK_AUDIT_MUTATION,
        {
          input: {
            modelId,
            modelVersionId: versionId,
            name: auditName,
          },
        },
        { organization: orgId }
      );

      const payload = result?.createBlankAudit;
      if (!payload?.success || !payload?.audit?.id) {
        setAuditError(payload?.message || "Failed to create evaluation.");
        return null;
      }

      const auditId = String(payload.audit.id);
      setCurrentAuditId(auditId);
      updateUrlWithAuditId(auditId);
      return auditId;
    } catch (error: any) {
      setAuditError(error.message || "Error creating evaluation.");
      return null;
    } finally {
      setIsCreatingAudit(false);
    }
  };

  // Update audit with current configuration
  const updateAuditConfig = async (
    auditIdOverride?: string
  ): Promise<boolean> => {
    const auditId = auditIdOverride || currentAuditId;
    if (!auditId) return false;

    const { modules: modulesList, metrics: metricsList } =
      buildModulesAndMetrics();

    try {
      const result = await request<{
        updateAudit: { success: boolean; message: string; audit: any };
      }>(
        UPDATE_AUDIT_MUTATION,
        {
          input: {
            auditId: auditId,
            name: auditName,
            auditType,
            evaluationMode: modeOfEvaluation || "automated",
            auditScope: auditScope.trim() || null,
            modules: modulesList,
            metrics: metricsList,
            testDatasetIds: selectedPromptLibraries.map((item: any) => item.id),
            auditorName,
            organisationName,
            auditObjective,
            configuration: {
              auditorName,
              organisationName,
              auditType,
              testInputMode,
              pastedTestCases,
              selectedPromptDatasetIds: selectedPromptLibraries
                .map((item: any) => item?.id)
                .filter(Boolean)
                .map((id: string | number) => String(id)),
            },
          },
        },
        { organization: orgId }
      );

      if (!result?.updateAudit?.success) {
        setAuditError(
          result?.updateAudit?.message || "Failed to update evaluation."
        );
        return false;
      }

      lastSavedDraftSnapshotRef.current = getDraftSnapshot();
      hasUnsavedDraftChangesRef.current = false;
      hasInitializedSavedSnapshotRef.current = true;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          getPromptDatasetStorageKey(auditId),
          JSON.stringify(
            selectedPromptLibraries
              .map((item: any) => item?.id)
              .filter(Boolean)
              .map((id: string | number) => String(id))
          )
        );
      }
      return true;
    } catch (error: any) {
      setAuditError(error.message || "Error updating evaluation.");
      return false;
    }
  };

  const handleCancelEvaluation = async () => {
    if (!confirm("Are you sure you want to cancel this evaluation?")) return;
    const auditId = currentAuditId;
    if (!auditId) {
      isNavigatingAwayRef.current = true;
      // Avoid router.back() here because history guards can keep user on the same page.
      window.location.assign(evaluationsListPath);
      return;
    }
    setIsCancelling(true);
    setAuditError(null);
    try {
      // Prevent unsaved-progress leave guards from firing during explicit cancel flow.
      isNavigatingAwayRef.current = true;
      const result = await request<{
        updateAudit: { success: boolean; message: string };
      }>(
        UPDATE_AUDIT_MUTATION,
        {
          input: { auditId, status: "CANCELLED" },
        },
        { organization: orgId }
      );
      if (result?.updateAudit?.success) {
        // Use a hard navigation so the list refreshes immediately and doesn't rely on client cache.
        window.location.assign(evaluationsListPath);
      } else {
        isNavigatingAwayRef.current = false;
        setAuditError(
          result?.updateAudit?.message || "Failed to cancel evaluation."
        );
      }
    } catch (error: any) {
      isNavigatingAwayRef.current = false;
      setAuditError(error?.message || "Failed to cancel evaluation.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Helper function to map module name keys to display names
  // Prefer backend-provided displayName from modulesByModelType / metricsByModelType
  const getModuleDisplayName = (moduleName: string): string => {
    const moduleFromState = modules.find((m) => m.name === moduleName);
    if (moduleFromState?.displayName) {
      return moduleFromState.displayName;
    }

    // Fallback to a readable version of the enum-like name
    return toTitleCase(moduleName.replace(/_/g, " "));
  };

  // Track if modules have been fetched to prevent duplicate calls
  const modulesFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastModelTypeRef = useRef<string | null>(null);
  const modelsFetchedRef = useRef(false);
  const isFetchingModelsRef = useRef(false);

  // Load evaluation modules from GraphQL API using modulesByModelType
  useEffect(() => {
    // Reset flags if modelType changed
    if (
      lastModelTypeRef.current !== null &&
      lastModelTypeRef.current !== modelType
    ) {
      modulesFetchedRef.current = false;
      isFetchingRef.current = false;
    }
    lastModelTypeRef.current = modelType;

    // Prevent duplicate calls - check multiple conditions
    if (
      !isAuthenticated ||
      isSessionLoading ||
      modulesFetchedRef.current ||
      isFetchingRef.current ||
      isLoadingModules ||
      invalidModelError ||
      !selectedModelId
    ) {
      return;
    }

    // Mark as fetching IMMEDIATELY to prevent any race conditions
    isFetchingRef.current = true;
    modulesFetchedRef.current = true;

    const fetchModules = async () => {
      try {
        setIsLoadingModules(true);
        setModulesError(null);

        const data = await request<{ modulesByModelType: Module[] }>(
          MODULES_BY_MODEL_TYPE_QUERY,
          { modelType }
        );

        const modulesData = Array.isArray(data?.modulesByModelType)
          ? data.modulesByModelType
          : [];
        setModules(modulesData);

        // Also pre-fetch metrics for all modules for this modelType
        let initialModuleMetrics: Record<string, SelectOption[]> = {};
        let initialSelectedMetrics: Record<string, SelectOption[]> = {};

        try {
          const metricsResp = await request<{
            metricsByModelType: Array<{
              name: string;
              metrics: Array<{ name: string; displayName?: string }>;
            }>;
          }>(METRICS_BY_MODEL_TYPE_QUERY, { modelType });

          const metricsData = metricsResp?.metricsByModelType || [];

          metricsData.forEach((moduleMetrics: any) => {
            if (
              moduleMetrics?.name &&
              Array.isArray(moduleMetrics.metrics) &&
              moduleMetrics.metrics.length > 0
            ) {
              const metricsOptions = moduleMetrics.metrics.map(
                (metric: any) => ({
                  value: metric.name,
                  label:
                    metric.displayName ||
                    toTitleCase(metric.name.replace(/_/g, " ")),
                })
              );

              initialModuleMetrics[moduleMetrics.name] = metricsOptions;
              initialSelectedMetrics[moduleMetrics.name] = metricsOptions;
            }
          });

          setModuleMetricsOptions(initialModuleMetrics);
          setSelectedMetrics(initialSelectedMetrics);
        } catch (metricsError) {
          console.warn("Failed to prefetch metricsByModelType", metricsError);
        }

        // Initialize selected modules state - all selected by default
        const initialSelected: Record<string, boolean> = {};
        if (Array.isArray(modulesData)) {
          modulesData.forEach((module: Module) => {
            if (module?.name) {
              initialSelected[module.name] = true;

              if (
                !initialSelectedMetrics[module.name] &&
                Array.isArray(module.metrics) &&
                module.metrics.length > 0
              ) {
                const moduleMetricsOptions = module.metrics
                  .map((metric) => ({
                    value: metric?.name || "",
                    label:
                      metric?.displayName ||
                      toTitleCase((metric?.name || "").replace(/_/g, " ")),
                  }))
                  .filter((opt) => opt.value);

                if (moduleMetricsOptions.length > 0) {
                  initialSelectedMetrics[module.name] = moduleMetricsOptions;
                }
              }
            }
          });
        }
        setSelectedModules(initialSelected);

        if (Object.keys(initialSelectedMetrics).length > 0) {
          setSelectedMetrics(initialSelectedMetrics);
        }
      } catch (error: any) {
        if (
          error?.message?.includes("Failed to fetch") ||
          error?.message?.includes("ERR_CONNECTION_REFUSED") ||
          error?.message?.includes("Backend server") ||
          error?.message?.includes("NetworkError")
        ) {
          setModulesError(
            error.message ||
              "Backend server is not available. Please check your NEXT_PUBLIC_BACKEND_URL configuration."
          );
        } else {
          const errorMessage =
            error?.message ||
            error?.response?.errors?.[0]?.message ||
            "Unknown error";
          setModulesError(
            `Failed to load evaluation modules: ${errorMessage}. Please check your authentication and backend configuration.`
          );
          modulesFetchedRef.current = false;
        }
      } finally {
        setIsLoadingModules(false);
        isFetchingRef.current = false;
      }
    };

    fetchModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelType, isAuthenticated, isSessionLoading]);

  // Fetch AI models from backend
  const fetchAIModels = async () => {
    if (
      !isAuthenticated ||
      isSessionLoading ||
      modelsFetchedRef.current ||
      isFetchingModelsRef.current
    ) {
      return;
    }

    isFetchingModelsRef.current = true;
    modelsFetchedRef.current = true;

    try {
      setIsLoadingModels(true);
      setModelsError(null);

      const modelsResponse = await request<{
        aiModels: Array<{
          id: string;
          name: string;
          displayName: string;
          version: string;
          modelType: string;
          organization?: string;
          versions?: Array<{
            id: number;
            version: string;
            isLatest: boolean;
            status: string;
          }>;
        }>;
      }>(
        AI_MODELS_QUERY,
        {
          status: "ACTIVE",
          modelType: null,
          provider: null,
          isPublic: true,
          limit: 50,
          offset: 0,
        },
        { organization: orgId }
      );

      const models = modelsResponse?.aiModels || [];
      setAiModels(models);

      // Validate URL parameters if they exist
      if (urlModelId) {
        const foundModel = models.find((m) => m.id === urlModelId);
        if (!foundModel) {
          setInvalidModelError(
            `The selected model (ID: ${urlModelId}) does not exist or is not available. Please select a different model.`
          );
          setSelectedModelId(null);
          setSelectedVersionId(null);
        } else {
          // Model exists, check version if provided
          if (urlVersionId) {
            const versionExists = foundModel.versions?.some(
              (v) => v.id === parseInt(urlVersionId)
            );
            if (!versionExists) {
              setInvalidModelError(
                `The selected model version (ID: ${urlVersionId}) does not exist for this model. Please select a different version.`
              );
              setSelectedModelId(urlModelId);
              setSelectedVersionId(null);
            } else {
              // Both model and version are valid
              setInvalidModelError(null);
              setSelectedModelId(urlModelId);
              setSelectedVersionId(parseInt(urlVersionId));
            }
          } else if (urlVersion) {
            const versionObj = foundModel.versions?.find(
              (v) => v.version === urlVersion
            );
            if (!versionObj) {
              setInvalidModelError(
                `The selected model version (${urlVersion}) does not exist for this model. Please select a different version.`
              );
              setSelectedModelId(urlModelId);
              setSelectedVersionId(null);
            } else {
              setInvalidModelError(null);
              setSelectedModelId(urlModelId);
              setSelectedVersionId(versionObj.id);
            }
          } else {
            // Model exists but no version specified, use latest
            setInvalidModelError(null);
            setSelectedModelId(urlModelId);
            const latestVer = foundModel.versions?.find((v) => v.isLatest);
            if (latestVer) {
              setSelectedVersionId(latestVer.id);
            }
          }
        }
      } else {
        // No URL params, auto-select first model
        setInvalidModelError(null);
        if (models.length > 0 && !selectedModelId) {
          setSelectedModelId(models[0].id);
          const firstModel = models[0];
          const latestVer = firstModel.versions?.find((v) => v.isLatest);
          if (latestVer) {
            setSelectedVersionId(latestVer.id);
          }
        }
      }
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.response?.errors?.[0]?.message ||
        "Unknown error";
      setModelsError(
        `Failed to load AI models: ${errorMessage}. Please check your authentication and backend configuration.`
      );
      modelsFetchedRef.current = false;
    } finally {
      setIsLoadingModels(false);
      isFetchingModelsRef.current = false;
    }
  };

  // Fetch AI models when authenticated
  useEffect(() => {
    if (
      isAuthenticated &&
      !isSessionLoading &&
      !modelsFetchedRef.current &&
      !isFetchingModelsRef.current
    ) {
      fetchAIModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isSessionLoading]);

  // Re-validate when URL params change (e.g., after modal navigation)
  useEffect(() => {
    if (aiModels.length > 0 && urlModelId) {
      const foundModel = aiModels.find((m) => m.id === urlModelId);
      if (foundModel) {
        // Model exists, validate version
        if (urlVersionId) {
          const versionExists = foundModel.versions?.some(
            (v) => v.id === parseInt(urlVersionId)
          );
          if (versionExists) {
            setInvalidModelError(null);
            setSelectedModelId(urlModelId);
            setSelectedVersionId(parseInt(urlVersionId));
          }
        } else {
          // No version specified, clear error and use latest
          setInvalidModelError(null);
          setSelectedModelId(urlModelId);
          const latestVer = foundModel.versions?.find((v) => v.isLatest);
          if (latestVer) {
            setSelectedVersionId(latestVer.id);
          }
        }
      }
    } else if (!urlModelId && aiModels.length > 0) {
      // No URL params, clear error
      setInvalidModelError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlModelId, urlVersionId, aiModels.length]);

  // Reset modules when model changes
  useEffect(() => {
    if (selectedModelId) {
      modulesFetchedRef.current = false;
      isFetchingRef.current = false;
    }
  }, [selectedModelId]);

  // Fetch metrics for a specific module
  const fetchMetricsForModule = async (
    moduleName: string
  ): Promise<SelectOption[]> => {
    if (!isAuthenticated) {
      return [];
    }

    try {
      const data = await request<{
        metricsByModelType: Array<{
          name: string;
          metrics: Array<{ name: string; displayName?: string }>;
        }>;
      }>(METRICS_BY_MODEL_TYPE_QUERY, { modelType });

      const metricsData = data?.metricsByModelType || [];
      const moduleMetrics = metricsData.find((m: any) => m.name === moduleName);
      if (!moduleMetrics || !moduleMetrics.metrics) {
        return [];
      }

      return moduleMetrics.metrics.map((metric: any) => ({
        value: metric.name,
        label:
          metric.displayName || toTitleCase(metric.name.replace(/_/g, " ")),
      }));
    } catch (error: any) {
      return [];
    }
  };

  const validateTestCases = (): boolean => {
    if (modeOfEvaluation === "manual") {
      return true;
    }

    const hasPromptLibraries = selectedPromptLibraries.length > 0;
    const hasCustomTestCases =
      (testInputMode === "paste" && pastedTestCases.trim().length > 0) ||
      (testInputMode === "upload" && uploadedFiles.length > 0);
    return hasPromptLibraries || hasCustomTestCases;
  };

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!auditObjective.trim()) {
      errors.auditObjective = "Evaluation objective is required";
    }

    if (
      evaluationScopeOptions.length > 0 &&
      (!auditScope || auditScope.trim() === "")
    ) {
      errors.auditScope = "Evaluation scope is required";
    }

    if (!modeOfEvaluation || modeOfEvaluation.trim() === "") {
      errors.modeOfEvaluation = "Mode of evaluation is required";
    }

    const hasSelectedModules = Object.values(selectedModules).some(
      (isSelected) => isSelected
    );
    if (!hasSelectedModules) {
      errors.modules = "At least one evaluation module must be selected";
    }

    const modulesWithoutMetrics: string[] = [];
    Object.entries(selectedModules).forEach(([moduleName, isSelected]) => {
      if (isSelected) {
        const metrics = selectedMetrics[moduleName];
        if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
          modulesWithoutMetrics.push(moduleName);
        }
      }
    });

    if (modulesWithoutMetrics.length > 0) {
      errors.metrics =
        "Each selected module must have at least one metric selected";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildModulesAndMetrics = () => {
    const selectedModuleNames: string[] = [];
    const selectedMetricNames: string[] = [];

    Object.entries(selectedModules).forEach(([moduleName, isSelected]) => {
      if (isSelected) {
        selectedModuleNames.push(moduleName);
        const metrics = selectedMetrics[moduleName];
        if (Array.isArray(metrics) && metrics.length > 0) {
          metrics.forEach((metric) => {
            selectedMetricNames.push(metric.value);
          });
        }
      }
    });

    return { modules: selectedModuleNames, metrics: selectedMetricNames };
  };

  useEffect(() => {
    const snapshot = getDraftSnapshot();
    hasUnsavedDraftChangesRef.current =
      lastSavedDraftSnapshotRef.current !== "" &&
      snapshot !== lastSavedDraftSnapshotRef.current;
  }, [
    currentAuditId,
    auditName,
    auditType,
    selectedModelId,
    selectedVersionId,
    auditorName,
    organisationName,
    auditObjective,
    modeOfEvaluation,
    auditScope,
    selectedModules,
    selectedMetrics,
    selectedPromptLibraries,
    testInputMode,
    pastedTestCases,
    uploadedFiles,
  ]);

  useEffect(() => {
    if (isLoadingAuditDetails) return;
    if (hasInitializedSavedSnapshotRef.current) return;

    if (urlAuditId || currentAuditId) {
      lastSavedDraftSnapshotRef.current = getDraftSnapshot();
      hasUnsavedDraftChangesRef.current = false;
      hasInitializedSavedSnapshotRef.current = true;
    }
  }, [isLoadingAuditDetails, urlAuditId, currentAuditId]);

  useEffect(() => {
    hasTriggeredLeaveAutosaveRef.current = false;
  }, [
    currentAuditId,
    auditName,
    auditType,
    selectedModelId,
    selectedVersionId,
    auditorName,
    organisationName,
    auditObjective,
    modeOfEvaluation,
    auditScope,
    selectedModules,
    selectedMetrics,
    selectedPromptLibraries,
    testInputMode,
    pastedTestCases,
    uploadedFiles,
  ]);

  useEffect(() => {
    const autoSaveDraftOnLeave = () => {
      if (isNavigatingAwayRef.current) return;
      if (hasTriggeredLeaveAutosaveRef.current) return;
      if (!hasDraftProgress()) return;
      if (!hasUnsavedDraftChangesRef.current && currentAuditId) return;

      hasTriggeredLeaveAutosaveRef.current = true;
      void saveDraftProgress();
    };

    window.addEventListener("beforeunload", autoSaveDraftOnLeave);

    return () => {
      window.removeEventListener("beforeunload", autoSaveDraftOnLeave);
    };
  }, [
    currentAuditId,
    auditName,
    auditType,
    selectedModelId,
    selectedVersionId,
    modeOfEvaluation,
    auditObjective,
    auditScope,
    auditorName,
    organisationName,
    selectedModules,
    selectedMetrics,
    selectedPromptLibraries,
    testInputMode,
    uploadedFiles,
    pastedTestCases,
    isSavingDraftBeforeExit,
    isCreatingAudit,
  ]);


  // Handle tab change - create audit if needed and update config
  const handleTestTabClick = async () => {
    if (!validateForm()) {
      return;
    }
    let auditId = currentAuditId;

    // Create audit if not already created
    if (!auditId && selectedModelId) {
      auditId = await createBlankAudit(selectedModelId, selectedVersionId);
      if (!auditId) {
        return; // Error already set
      }
    }

    // Update audit with current configuration (pass auditId directly to handle async state)
    if (auditId) {
      const updated = await updateAuditConfig(auditId);
      if (!updated) {
        return; // Error already set
      }
    }

    handleTabChange("test");
  };

  async function saveDraftProgress(): Promise<boolean> {
    if (isSavingDraftBeforeExit || isCreatingAudit) return false;

    setAuditError(null);
    setIsSavingDraftBeforeExit(true);

    try {
      let auditId = currentAuditId;

      // Persist form progress as draft before leaving, even if test cases were not added yet.
      if (!auditId && selectedModelId) {
        auditId = await createBlankAudit(selectedModelId, selectedVersionId);
        if (!auditId) {
          return false;
        }
      }

      if (auditId) {
        const updated = await updateAuditConfig(auditId);
        if (!updated) {
          return false;
        }
      }

      return true;
    } finally {
      setIsSavingDraftBeforeExit(false);
    }
  }

  const handleBackToList = async () => {
    const saved = await saveDraftProgress();
    if (!saved) return;

    isNavigatingAwayRef.current = true;
    router.push(evaluationsListPath);
  };

  const handleRunAudit = async () => {
    if (!isAuthenticated) {
      setAuditError("Please log in to run an audit.");
      return;
    }

    // Ensure we have an audit ID
    let auditId = currentAuditId;

    if (!auditId && selectedModelId) {
      // Create audit if not exists
      auditId = await createBlankAudit(selectedModelId, selectedVersionId);
      if (!auditId) {
        return; // Error already set
      }
    }

    if (!auditId) {
      setAuditError("Please select an AI model before running the audit.");
      return;
    }

    // Update audit config first (pass auditId directly to handle async state)
    const updated = await updateAuditConfig(auditId);
    if (!updated) {
      return; // Error already set
    }

    // Prepare custom test inputs
    let customTestInputs: string | null = null;

    if (testInputMode === "paste" && pastedTestCases.trim()) {
      customTestInputs = pastedTestCases.trim();
    } else if (testInputMode === "upload" && uploadedFiles.length > 0) {
      const fileData = uploadedFiles.map((file) => ({
        filename: file.name,
      }));
      customTestInputs = JSON.stringify(fileData);
    }

    setAuditOverview(null);
    setAuditError(null);
    setIsRequestingAudit(true);

    try {
      // Use the new runAudit mutation
      const result = await request<{
        runAudit: { success: boolean; message: string; audit: any };
      }>(
        RUN_AUDIT_MUTATION,
        { input: { auditId, customTestInputs } },
        { organization: orgId }
      );

      const payload = result?.runAudit;
      if (!payload) {
        setAuditError("Audit response was empty.");
        setIsRequestingAudit(false);
        return;
      }

      if (!payload.success) {
        setAuditError(payload.message || "Failed to start audit.");
        setIsRequestingAudit(false);
        return;
      }

      const audit = payload.audit || {};

      if (!audit.id) {
        setAuditError("Audit ID not found in response.");
        setIsRequestingAudit(false);
        return;
      }

      const started = audit.startedAt
        ? new Date(audit.startedAt)
        : audit.started_at
          ? new Date(audit.started_at)
          : null;
      const completed = audit.completedAt
        ? new Date(audit.completedAt)
        : audit.completed_at
          ? new Date(audit.completed_at)
          : null;
      const created = audit.createdAt
        ? new Date(audit.createdAt)
        : audit.created_at
          ? new Date(audit.created_at)
          : null;

      const timeSource = completed || started || created;

      let durationSeconds: number | null = null;
      if (started && completed) {
        durationSeconds = Math.round(
          (completed.getTime() - started.getTime()) / 1000
        );
      }

      const formattedTime =
        timeSource?.toLocaleString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }) || null;

      setAuditOverview({
        auditId: audit.id,
        auditTime: formattedTime,
        durationSeconds,
      });

      // Redirect based on context
      if (fromAuditor) {
        router.push(`/${locale}/dashboard/auditor/evaluations/${audit.id}`);
      } else {
        router.push(
          `/${locale}/dashboard/ai-maker/${orgId}/evaluations/${audit.id}`
        );
      }
    } catch (error: any) {
      const errorMessage =
        error?.message || "Network error while starting audit.";
      setAuditError(errorMessage);
    } finally {
      setIsRequestingAudit(false);
    }
  };

  return (
    <>
      <div
        className={`flex-1 ${styles.auditContent} p-4 sm:p-6 lg:p-10 mt-6 lg:mt-0`}
      >
        {/* Invalid Model/Version Error */}
        {invalidModelError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <Text
                  variant="bodyMd"
                  className="text-red-800 font-medium mb-1 mr-2"
                >
                  Invalid Model or Version Selected
                </Text>
                <Text variant="bodySm" className="text-red-700">
                  {invalidModelError}
                </Text>
                <div className="mt-3">
                  <Button
                    kind="secondary"
                    onClick={() => {
                      setIsModalOpen(true);
                    }}
                  >
                    Start Fresh Evaluation
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading state when fetching audit details */}
        {urlAuditId && isLoadingAuditDetails && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Spinner />
            <Text variant="bodySm" className="text-gray-600">
              Loading evaluation details...
            </Text>
          </div>
        )}

        {/* Audit Name + Header Actions */}
        <div
          className={`flex items-center justify-between gap-4 ${styles.auditNameSection} max-[1023px]:gap-0.5 mb-8`}
        >
          <div className="flex items-center gap-4 flex-wrap min-w-0 flex-1 evaluation-name-row max-[640px]:flex-row max-[640px]:items-center max-[640px]:gap-2">
            <Label
              htmlFor="auditName"
              className={`${styles.auditNameLabel} flex-shrink-0 whitespace-nowrap text-left`}
            >
              Evaluation Name :
            </Label>
            <div
              className={`${styles.auditNameInputWrapper} flex-1 min-w-0 max-w-[380px] max-[1024px]:max-w-full max-[640px]:w-full`}
            >
              <TextField
                id="auditName"
                name="evaluationName"
                label="Evaluation Name"
                labelHidden
                value={auditName}
                onChange={(value) => setAuditName(value)}
              />
            </div>
            <div className="flex-shrink-0 max-[640px]:w-full max-[640px]:flex max-[640px]:items-start">
              <div
                className={`${styles.tagWrapper} ${styles.auditTag}`}
                style={{ borderRadius: "4px", overflow: "hidden" }}
              >
                <Tag variation="filled" fillColor="#E2F5C4" textColor="#0A0704">
                  {auditType === "Technical"
                    ? "Technical Evaluation"
                    : auditType === "Domain"
                      ? "Domain Evaluation"
                      : "Cultural Evaluation"}
                </Tag>
              </div>
            </div>
          </div>

          <div
            className={`flex items-center justify-end gap-4 ${styles.auditStatusContainer} flex-shrink-0 max-[1023px]:gap-0.5 max-[1023px]:mt-0 mr-0 translate-x-1`}
          >
            <Button
              kind="tertiary"
              onClick={handleBackToList}
              disabled={isSavingDraftBeforeExit || isCreatingAudit}
              className={styles.cancelAuditButton}
            >
              <span className="inline-flex items-center">
                <Icon
                  source={IconArrowLeft}
                  size={18}
                  className={styles.backToListIcon}
                />
              </span>
              {isSavingDraftBeforeExit ? "Saving..." : "Back to List"}
            </Button>
            <Button
              kind="tertiary"
              variant="critical"
              onClick={handleCancelEvaluation}
              disabled={isCancelling}
              className={`${styles.cancelAuditButton} flex-shrink-0 max-[640px]:ml-4`}
            >
              <span className="inline-flex items-center">
                <Icon
                  source={IconTrash}
                  size={18}
                  className={styles.cancelIconOutline}
                />
              </span>
              {isCancelling ? "Cancelling..." : "Cancel"}
            </Button>
          </div>
        </div>
        {/* Model Name and Owner Section - Hide while loading audit details */}
        {!(urlAuditId && isLoadingAuditDetails) && (
          <div className="mb-6 bg-white overview-evaluation-section">
            <div className="p-4 sm:p-6">
              <div className="-mt-1">
                {/* Model Selector - Only show if no URL params and no audit loaded */}
                {!urlModelId && !currentAuditId && (
                  <div className="mb-4 max-w-md">
                    {isLoadingModels ? (
                      <div className="flex flex-col items-center gap-4">
                        <Spinner />
                        <Text variant="bodySm" className="text-gray-600">
                          Loading models...
                        </Text>
                      </div>
                    ) : modelsError ? (
                      <div>
                        <Text variant="bodySm" className="text-red-600">
                          {modelsError}
                        </Text>
                      </div>
                    ) : aiModels.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        <Select
                          name="modelSelect"
                          label="Select AI Model"
                          options={aiModels.map((model) => ({
                            value: model.id,
                            label: model.displayName || model.name,
                          }))}
                          value={selectedModelId || ""}
                          onChange={(value) => {
                            setSelectedModelId(value);
                            const model = aiModels.find((m) => m.id === value);
                            const latestVer = model?.versions?.find(
                              (v) => v.isLatest
                            );
                            setSelectedVersionId(latestVer?.id || null);
                          }}
                          disabled={
                            typeof activeTab !== "undefined" &&
                            activeTab !== "config"
                          }
                        />
                        {selectedModel &&
                          selectedModel.versions &&
                          selectedModel.versions.length > 0 && (
                            <Select
                              name="versionSelect"
                              label="Select Model Version"
                              options={selectedModel.versions.map((ver) => ({
                                value: String(ver.id),
                                label: `${ver.version}${ver.isLatest ? " (Latest)" : ""}`,
                              }))}
                              value={
                                selectedVersionId
                                  ? String(selectedVersionId)
                                  : ""
                              }
                              onChange={(value) =>
                                setSelectedVersionId(
                                  value ? Number(value) : null
                                )
                              }
                              disabled={
                                typeof activeTab !== "undefined" &&
                                activeTab !== "config"
                              }
                            />
                          )}
                      </div>
                    ) : (
                      <div>
                        <Text variant="bodySm" className="text-gray-600">
                          No models available. Please check your backend
                          configuration.
                        </Text>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className={`mb-0 ${styles.modelNameContainer}`}>
                    <Text variant="bodyMd" className="text-gray-500">
                      Model Name :{" "}
                    </Text>
                    <Text
                      as="h1"
                      variant="headingXl"
                      className="font-bold text-gray-900 break-words"
                    >
                      {modelVersion && modelName?.includes(modelVersion)
                        ? modelName
                        : modelVersion
                          ? `${modelName} ${modelVersion}`
                          : modelName}
                    </Text>
                  </div>

                  <div className="flex items-center gap-2">
                    <Image
                      src="/images/logos/CDL Logo.png"
                      alt="CivicDataLab Logo"
                      width={50}
                      height={50}
                      className="object-contain rounded-full cdl-round-logo"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 max-[1023px]:mb-3 max-[640px]:mb-2">
          <div
            className={`flex gap-6 max-[1023px]:gap-0 ${styles.tabsContainer} w-full`}
          >
            <button
              onClick={() => handleTabChange("config")}
              disabled={!!invalidModelError}
              className={`${styles.auditConfigTab} flex-1 ${
                activeTab === "config"
                  ? `${styles.auditConfigTabActive} text-gray-900 font-semibold`
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent"
              } ${invalidModelError ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Text
                variant="bodyMd"
                className={
                  activeTab === "config"
                    ? "text-gray-900 font-semibold"
                    : "text-gray-600"
                }
              >
                Evaluation Configuration
              </Text>
            </button>
            <button
              onClick={handleTestTabClick}
              disabled={isCreatingAudit || !!invalidModelError}
              className={`${styles.auditConfigTab} flex-1 ${
                activeTab === "test"
                  ? `${styles.auditConfigTabActive} text-gray-900 font-semibold`
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent"
              } ${isCreatingAudit || invalidModelError ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Text
                variant="bodyMd"
                className={
                  activeTab === "test"
                    ? "text-gray-900 font-semibold"
                    : "text-gray-600"
                }
              >
                {isCreatingAudit ? "Creating Evaluation..." : "Test Cases"}
              </Text>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "config" && (
          <div
            className={
              invalidModelError ? "pointer-events-none opacity-50" : ""
            }
          >
            <EvaluationConfiguration
              auditType={auditType}
              setAuditType={setAuditType}
              auditorName={auditorName}
              setAuditorName={setAuditorName}
              organisationName={organisationName}
              setOrganisationName={setOrganisationName}
              auditObjective={auditObjective}
              setAuditObjective={setAuditObjective}
              auditScope={auditScope}
              setAuditScope={setAuditScope}
              evaluationScopeOptions={evaluationScopeOptions}
              modeOfEvaluation={modeOfEvaluation}
              setModeOfEvaluation={setModeOfEvaluation}
              modules={modules}
              selectedModules={selectedModules}
              setSelectedModules={setSelectedModules}
              selectedMetrics={
                selectedMetrics as Record<string, SelectOption[]>
              }
              setSelectedMetrics={setSelectedMetrics}
              moduleMetricsOptions={moduleMetricsOptions}
              setModuleMetricsOptions={setModuleMetricsOptions}
              isLoadingModules={isLoadingModules}
              modulesError={modulesError}
              fetchMetricsForModule={fetchMetricsForModule}
              getModuleDisplayName={getModuleDisplayName}
              toTitleCase={toTitleCase}
              validationErrors={validationErrors}
              setValidationErrors={setValidationErrors}
              isModeOfEvaluationLocked={hasManualTestCases}
            />
          </div>
        )}

        {activeTab === "test" && (
          <div
            className={
              invalidModelError ? "pointer-events-none opacity-50" : ""
            }
          >
            {modeOfEvaluation === "manual" ? (
              <ManualTestCases
                auditId={currentAuditId || undefined}
                modules={buildModulesAndMetrics().modules}
                modelType={modelType}
                orgId={orgId}
                onRunAudit={handleRunAudit}
                isRequestingAudit={isRequestingAudit}
                onTestCaseCountChange={handleManualTestCaseCountChange}
              />
            ) : (
              <TestCases
                orgId={orgId}
                selectedPromptLibraries={selectedPromptLibraries}
                setSelectedPromptLibraries={setSelectedPromptLibraries}
                uploadedFiles={uploadedFiles}
                setUploadedFiles={setUploadedFiles}
                domain={auditScope || null}
                pastedTestCases={pastedTestCases}
                setPastedTestCases={setPastedTestCases}
                testInputMode={testInputMode}
                setTestInputMode={setTestInputMode}
                onRunAudit={handleRunAudit}
                isRequestingAudit={isRequestingAudit}
              />
            )}
          </div>
        )}

        {/* Navigation Buttons - Audit Configuration tab */}
        {activeTab === "config" && (
          <div className="flex items-center justify-center gap-6 pt-8">
            <Button
              kind="secondary"
              onClick={handleTestTabClick}
              disabled={isCreatingAudit || !!invalidModelError}
              className={styles.addTestCasesButton}
            >
              <span className="add-test-cases-text">
                {isCreatingAudit ? "Creating..." : "Add Test Cases"}
              </span>

              <Image
                src="/images/icons/circle-arrow-right.png"
                alt="Circle arrow right"
                width={18}
                height={18}
                className={`object-contain ${styles.addTestCasesIcon}`}
              />
            </Button>
          </div>
        )}
      </div>

      {/* Model Selection Modal */}
      <ModelSelectionModal
        key="model-selection-modal"
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          // Clear invalid model error when modal opens (user is starting fresh)
          if (open) {
            setInvalidModelError(null);
          }
        }}
        orgId={orgId}
      />
    </>
  );
};

export default NewEvaluationContent;
