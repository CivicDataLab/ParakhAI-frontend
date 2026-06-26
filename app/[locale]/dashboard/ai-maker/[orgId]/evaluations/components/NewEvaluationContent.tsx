"use client";

import { useGraphQL } from "@/lib/api";
import { useAppSession } from "@/lib/session";
import { getEvaluationStatusColor } from "@/lib/statusColors";
import { formatGraphQLError, toTitleCase } from "@/lib/utils";
import { IconArrowLeft, IconTrash } from "@tabler/icons-react";
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
import EvaluationFormOverview from "./EvaluationFormOverview";
import { getFallbackEvaluationModules } from "./manual-evaluation/utils";
import ManualTestCases from "./ManualTestCases";
import ModelSelectionModal from "./ModelSelectionModal";
import styles from "./styles.module.scss";
import TestCases from "./TestCases";
import type { AuditType, Module, SelectOption } from "./types";

// GraphQL queries for dynamic modules and metrics
const METRICS_BY_MODEL_TYPE_QUERY = `
  query MetricsByModelType($modelType: String!,$domain: String!) {
    metricsByModelType(modelType: $modelType, domain: $domain) {
      name
      displayName
      description
      metrics {
        name
        displayName
        description
        mandatoryInputs
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
      modelSnapshot
      modelId
      modelVersionId
      modelName
      modules
      metrics
      testDatasetIds
      configuration
      createdAt
      completedAt
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
  const urlEvaluationName = searchParams.get("name");
  const urlEvaluationMode = searchParams.get("evaluationMode");
  const urlAuditType = searchParams.get("auditType");
  const urlAuditScope = searchParams.get("auditScope");
  const urlAuditObjective = searchParams.get("auditObjective");
  const urlModelType = searchParams.get("modelType");
  const urlModelDisplayName = searchParams.get("displayName");

  const [auditType, setAuditType] = useState<AuditType>(() => {
    const parsed = parseAuditTypeFromBackend(urlAuditType);
    return parsed ?? "Technical";
  });
  const [activeTab, setActiveTab] = useState<"config" | "test">("config");
  const [auditName, setAuditName] = useState(
    () => urlEvaluationName || generateDefaultAuditName(),
  );

  // Current audit ID - persisted in URL
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(
    urlAuditId
  );
  const [isCreatingAudit, setIsCreatingAudit] = useState(false);
  const [isSavingDraftBeforeExit, setIsSavingDraftBeforeExit] = useState(false);
  // Start as true when auditId is present so the "Initialize snapshot" effect
  // waits for the real values before capturing a baseline, preventing a false
  // "unsaved changes" signal that would trigger an immediate UpdateAudit.
  const [isLoadingAuditDetails, setIsLoadingAuditDetails] = useState(!!urlAuditId);

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
  const selectedModelDomain = Array.isArray(selectedModel?.domain)
    ? selectedModel.domain.find(Boolean) || ""
    : selectedModel?.domain || "";

  const [evaluationScopeOptions, setEvaluationScopeOptions] = useState<
    SelectOption[]
  >([]);
  const [isLoadingEvaluationScopeOptions, setIsLoadingEvaluationScopeOptions] =
    useState(false);
  const evaluationScopeOptionsKey = evaluationScopeOptions
    .map((o) => o.value)
    .join("|");

  // GraphQL API hook for authenticated requests
  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();

  // Get user session for expert name
  const { user } = useAppSession();

  // Keep auditScope aligned with the selected model's available domains
  useEffect(() => {
    if (isLoadingEvaluationScopeOptions) return;
    if (evaluationScopeOptions.length === 0 || !auditScope) return;

    const exists = evaluationScopeOptions.some((o) => o.value === auditScope);
    if (exists) return;

    const caseMatch = evaluationScopeOptions.find(
      (option) => option.value.toLowerCase() === auditScope.toLowerCase(),
    );
    if (caseMatch) {
      setAuditScope(caseMatch.value);
    }
    // Keep the saved scope even when options use a different key format.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedModelId,
    auditType,
    evaluationScopeOptionsKey,
    isLoadingEvaluationScopeOptions,
  ]);

  // Resolve evaluation scope options via:
  // 1) selectedModelDomain (already loaded from AI_MODELS_QUERY or AI_MODEL_BY_ID_QUERY)
  // 2) auditDomainOptions(domain) -> domains[]
  // Only needed before an audit exists — once urlAuditId is present, scope is
  // already saved on the audit and GET_AUDIT_QUERY is the source of truth.
  useEffect(() => {
    const fetchAuditDomainOptions = async () => {
      if (urlAuditId || !selectedModelId || !isAuthenticated || isSessionLoading) {
        setIsLoadingEvaluationScopeOptions(false);
        return;
      }

      // Domain is already available from the loaded model — no extra query needed.
      if (!selectedModelDomain) {
        setEvaluationScopeOptions([]);
        setIsLoadingEvaluationScopeOptions(false);
        return;
      }

      setIsLoadingEvaluationScopeOptions(true);
      try {
        const domainOptionsResult = await request<{
          auditDomainOptions: { domains?: any[] | null } | null;
        }>(
          AUDIT_DOMAIN_OPTIONS_QUERY,
          { domain: selectedModelDomain },
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
      } finally {
        setIsLoadingEvaluationScopeOptions(false);
      }
    };

    fetchAuditDomainOptions();
  }, [urlAuditId, selectedModelId, selectedModelDomain, isAuthenticated, isSessionLoading, request, orgId]);

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
  const [auditObjective, setAuditObjective] = useState(
    () => urlAuditObjective || "",
  );
  const [modeOfEvaluation, setModeOfEvaluation] = useState<string>(() => {
    const mode = urlEvaluationMode?.trim().toLowerCase();
    if (!mode) return "";
    return mode === "automated" || mode === "bulk" ? "bulk" : "playground";
  });
  const [hasManualTestCases, setHasManualTestCases] = useState(false);
  const [auditScope, setAuditScope] = useState<string>(
    () => urlAuditScope || "",
  );

  // Prefill organisation name when org details are loaded
  useEffect(() => {
    if (organization?.name && !organisationName) {
      setOrganisationName(organization.name);
    }
  }, [organization?.name, organisationName]);

  const handleManualTestCaseCountChange = useCallback((count: number) => {
    setHasManualTestCases(count > 0);
  }, []);

  useEffect(() => {
    if (!currentAuditId || modeOfEvaluation !== "playground") {
      setHasManualTestCases(false);
    }
  }, [currentAuditId, modeOfEvaluation]);

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
  const [testSourceMode, setTestSourceMode] = useState<"library" | "custom">(
    "library",
  );
  const [evaluationStatus, setEvaluationStatus] = useState("DRAFT");
  const [evaluationCreatedAt, setEvaluationCreatedAt] = useState<string | null>(
    null,
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
  const hasAutoCreatedDraftRef = useRef(false);
  // Tracks which auditId we've already fetched details for, preventing re-fetches
  // when effect deps like `request` change after a token refresh.
  const fetchedAuditIdRef = useRef<string | null>(null);
  const persistOverviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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
      if (fetchedAuditIdRef.current === urlAuditId) return;
      fetchedAuditIdRef.current = urlAuditId;

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
            modelSnapshot: any;
            modules: string[];
            metrics: string[];
            testDatasetIds: string[];
            configuration: any;
            createdAt?: string | null;
            completedAt?: string | null;
          } | null;
        }>(GET_AUDIT_QUERY, { auditId: urlAuditId }, { organization: orgId });

        const audit = result?.audit;
        if (audit) {
          setEvaluationStatus(audit.status || "DRAFT");
          setEvaluationCreatedAt(
            audit.createdAt
              ? new Date(audit.createdAt).toLocaleString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : null,
          );
          setAuditName(audit.name || generateDefaultAuditName());
          setSelectedModelId(audit.modelId);
          setSelectedVersionId(audit.modelVersionId);

          // Use modelSnapshot (saved at evaluation time) for all model details —
          // no extra network request needed.
          if (audit.modelId) {
            try {
              const snapshot = audit.modelSnapshot || {};
              const snapshotModelType: string =
                snapshot.modelType || snapshot.model_type || "TEXT_GENERATION";
              const snapshotDisplayName: string =
                snapshot.displayName || snapshot.display_name || snapshot.name || audit.modelName || "";
              const snapshotDomain = snapshot.domain ?? null;
              // API returns either a single `version` object or a legacy `versions` array
              const snapshotVersions: Array<{ id: number; version: string; isLatest: boolean; status: string }> =
                snapshot.versions || (snapshot.version ? [snapshot.version] : []);

              if (snapshotDisplayName) setAuditModelName(snapshotDisplayName);

              // Find the version string for the selected version
              if (audit.modelVersionId && snapshotVersions.length > 0) {
                const version = snapshotVersions.find((v) => v.id === audit.modelVersionId);
                if (version) setAuditModelVersion(version.version);
              }

              // Populate aiModels from snapshot so selectedModelDomain resolves
              setAiModels((prev) => {
                const exists = prev.find((m) => m.id === audit.modelId);
                if (exists) return prev;
                return [
                  ...prev,
                  {
                    id: audit.modelId,
                    name: snapshot.name || audit.modelName || "",
                    displayName: snapshotDisplayName,
                    modelType: snapshotModelType,
                    domain: snapshotDomain,
                    versions: snapshotVersions,
                  },
                ];
              });

              // Fetch all modules and metrics for this model type using MetricsByModelType.
              // Skip if already loaded or if this is a playground evaluation (no module selection needed).
              const evalModeLower = audit.evaluationMode?.toLowerCase() || "";
              const isPlaygroundAudit = evalModeLower === "manual" || evalModeLower === "playground";
              const auditConfig = audit.configuration || {};
              const scopeForMetrics =
                audit.auditScope ||
                (typeof auditConfig.auditScope === "string" ? auditConfig.auditScope : "") ||
                urlAuditScope ||
                "";
              if (!modulesFetchedRef.current && !isPlaygroundAudit) {
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
                        mandatoryInputs?: string[];
                      }>;
                    }>;
                  }>(METRICS_BY_MODEL_TYPE_QUERY, {
                    modelType: snapshotModelType,
                    domain: scopeForMetrics,
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
                          mandatoryInputs: metric.mandatoryInputs || [],
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
                  lastModelTypeRef.current = snapshotModelType;
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
              } // end if (!modulesFetchedRef.current)
            } catch (modelError) {
              console.error("Error processing model snapshot:", modelError);
            }
          }

          const config = audit.configuration || {};

          const restoredObjective =
            audit.auditObjective ||
            (typeof config.auditObjective === "string"
              ? config.auditObjective
              : "") ||
            urlAuditObjective ||
            "";
          if (restoredObjective) {
            setAuditObjective(restoredObjective);
          }

          const restoredScope =
            audit.auditScope ||
            (typeof config.auditScope === "string" ? config.auditScope : "") ||
            urlAuditScope ||
            "";
          if (restoredScope) {
            setAuditScope(restoredScope);
          }

          const restoredMode =
            audit.evaluationMode ||
            (typeof config.evaluationMode === "string"
              ? config.evaluationMode
              : "") ||
            urlEvaluationMode ||
            "";
          if (restoredMode) {
            const mode = String(restoredMode).trim().toLowerCase();
            setModeOfEvaluation(mode === "automated" || mode === "bulk" ? "bulk" : "playground");
          }

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
      setEvaluationStatus("DRAFT");
      setEvaluationCreatedAt(
        new Date().toLocaleString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      );
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
    auditIdOverride?: string,
    recommendation?: string
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
            evaluationMode:
              modeOfEvaluation === "bulk" || modeOfEvaluation === "automated" ? "BULK" : "PLAYGROUND",
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
              auditObjective,
              auditScope: auditScope.trim() || null,
              evaluationMode:
                modeOfEvaluation === "bulk" || modeOfEvaluation === "automated" ? "BULK" : "PLAYGROUND",
              testInputMode,
              pastedTestCases,
              selectedPromptDatasetIds: selectedPromptLibraries
                .map((item: any) => item?.id)
                .filter(Boolean)
                .map((id: string | number) => String(id)),
              ...(recommendation?.trim()
                ? { recommendation: recommendation.trim() }
                : {}),
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

  // Persist overview fields while configuring a draft
  useEffect(() => {
    if (!currentAuditId || isCreatingAudit || isLoadingAuditDetails) return;
    if (!auditScope && !auditObjective && !modeOfEvaluation) return;

    if (persistOverviewTimeoutRef.current) {
      clearTimeout(persistOverviewTimeoutRef.current);
    }

    persistOverviewTimeoutRef.current = setTimeout(() => {
      if (!hasUnsavedDraftChangesRef.current) return;
      void updateAuditConfig(currentAuditId);
    }, 700);

    return () => {
      if (persistOverviewTimeoutRef.current) {
        clearTimeout(persistOverviewTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentAuditId,
    auditScope,
    auditObjective,
    modeOfEvaluation,
    auditName,
    auditType,
    isCreatingAudit,
    isLoadingAuditDetails,
  ]);

  // Create draft immediately when arriving from the start-evaluation modal
  useEffect(() => {
    const autoCreateDraft = async () => {
      if (
        hasAutoCreatedDraftRef.current ||
        currentAuditId ||
        urlAuditId ||
        !urlModelId ||
        !selectedModelId ||
        invalidModelError ||
        isSessionLoading ||
        !isAuthenticated ||
        isCreatingAudit ||
        isLoadingAuditDetails
      ) {
        return;
      }

      hasAutoCreatedDraftRef.current = true;
      const auditId = await createBlankAudit(
        selectedModelId,
        selectedVersionId,
      );
      if (auditId) {
        await updateAuditConfig(auditId);
      } else {
        hasAutoCreatedDraftRef.current = false;
      }
    };

    void autoCreateDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentAuditId,
    urlAuditId,
    urlModelId,
    selectedModelId,
    selectedVersionId,
    invalidModelError,
    isSessionLoading,
    isAuthenticated,
    isCreatingAudit,
    isLoadingAuditDetails,
  ]);

  const handleCancelEvaluation = async () => {
    if (!confirm("Are you sure you want to cancel this evaluation?")) return;
    const auditId = currentAuditId;
    if (!auditId) {
      isNavigatingAwayRef.current = true;
      router.push(evaluationsListPath);
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
        router.push(evaluationsListPath);
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
  // Cache model domain per modelId to skip redundant AI_MODEL_BY_ID_QUERY calls
  const modelDomainCacheRef = useRef<Record<string, string>>({});

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
      !selectedModelId ||
      modeOfEvaluation === "playground"
    ) {
      return;
    }

    // Mark as fetching IMMEDIATELY to prevent any race conditions
    isFetchingRef.current = true;
    modulesFetchedRef.current = true;

    const applyModulesData = (
      modulesData: Module[],
      metricsData: Array<{
        name: string;
        metrics: Array<{ name: string; displayName?: string; mandatoryInputs?: string[] }>;
      }> = []
    ) => {
      setModules(modulesData);

      const initialModuleMetrics: Record<string, SelectOption[]> = {};
      const initialSelectedMetrics: Record<string, SelectOption[]> = {};

      metricsData.forEach((moduleMetrics) => {
        if (
          moduleMetrics?.name &&
          Array.isArray(moduleMetrics.metrics) &&
          moduleMetrics.metrics.length > 0
        ) {
          const metricsOptions = moduleMetrics.metrics.map((metric) => ({
            value: metric.name,
            label:
              metric.displayName ||
              toTitleCase(metric.name.replace(/_/g, " ")),
            mandatoryInputs: metric.mandatoryInputs || [],
          }));

          initialModuleMetrics[moduleMetrics.name] = metricsOptions;
          initialSelectedMetrics[moduleMetrics.name] = metricsOptions;
        }
      });

      const initialSelected: Record<string, boolean> = {};

      modulesData.forEach((module) => {
        if (!module?.name) return;

        initialSelected[module.name] = true;

        if (
          !initialSelectedMetrics[module.name] &&
          Array.isArray(module.metrics) &&
          module.metrics.length > 0
        ) {
          const metricsOptions = module.metrics
            .map((metric) => ({
              value: metric?.name || "",
              label:
                metric?.displayName ||
                toTitleCase((metric?.name || "").replace(/_/g, " ")),
              mandatoryInputs: metric?.mandatoryInputs || [],
            }))
            .filter((opt) => opt.value);

          if (metricsOptions.length > 0) {
            initialModuleMetrics[module.name] = metricsOptions;
            initialSelectedMetrics[module.name] = metricsOptions;
          }
        }
      });

      setModuleMetricsOptions(initialModuleMetrics);
      setSelectedModules(initialSelected);

      if (Object.keys(initialSelectedMetrics).length > 0) {
        setSelectedMetrics(initialSelectedMetrics);
      }
    };

    const fetchModules = async () => {
      try {
        setIsLoadingModules(true);
        setModulesError(null);

        const metricsResp = await request<{
          metricsByModelType: Array<{
            name: string;
            displayName?: string;
            description?: string;
            metrics: Array<{ name: string; displayName?: string; description?: string; mandatoryInputs?: string[] }>;
          }>;
        }>(METRICS_BY_MODEL_TYPE_QUERY, { modelType, domain: auditScope });

        const metricsData = metricsResp?.metricsByModelType || [];

        if (metricsData.length === 0) {
          applyModulesData(getFallbackEvaluationModules());
          setModulesError(
            "Evaluation modules could not be loaded from the server. Showing default modules."
          );
          return;
        }

        // Derive Module[] from metricsByModelType (superset of modulesByModelType)
        const modulesData: Module[] = metricsData.map((moduleData) => ({
          name: moduleData.name,
          displayName:
            moduleData.displayName ||
            toTitleCase(moduleData.name.replace(/_/g, " ")),
          description: moduleData.description || "",
          metrics: (moduleData.metrics || []).map((metric) => ({
            name: metric.name,
            displayName:
              metric.displayName ||
              toTitleCase(metric.name.replace(/_/g, " ")),
            description: metric.description || "",
            mandatoryInputs: metric.mandatoryInputs || [],
          })),
        }));

        applyModulesData(modulesData, metricsData);
      } catch (error: unknown) {
        console.error("Error loading evaluation modules:", error);
        applyModulesData(getFallbackEvaluationModules());
        setModulesError(
          `${formatGraphQLError(error, "Could not load evaluation modules from the server.")} Showing default modules.`
        );
      } finally {
        setIsLoadingModules(false);
        isFetchingRef.current = false;
      }
    };

    fetchModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelType, isAuthenticated, isSessionLoading, modeOfEvaluation]);

  const applyModelValidation = (
    model: {
      id: string;
      domain?: string | string[] | null;
      versions?: Array<{ id: number; version: string; isLatest: boolean; status: string }>;
    }
  ) => {
    // Cache domain so fetchAuditDomainOptions can skip AI_MODEL_BY_ID_QUERY
    const domain = Array.isArray(model.domain)
      ? model.domain.find(Boolean) || ""
      : model.domain || "";
    if (domain) modelDomainCacheRef.current[model.id] = domain;

    if (urlVersionId) {
      const versionExists = model.versions?.some((v) => v.id === parseInt(urlVersionId));
      if (!versionExists) {
        setInvalidModelError(
          `The selected model version (ID: ${urlVersionId}) does not exist for this model. Please select a different version.`
        );
        setSelectedModelId(model.id);
        setSelectedVersionId(null);
      } else {
        setInvalidModelError(null);
        setSelectedModelId(model.id);
        setSelectedVersionId(parseInt(urlVersionId));
      }
    } else if (urlVersion) {
      const versionObj = model.versions?.find((v) => v.version === urlVersion);
      if (!versionObj) {
        setInvalidModelError(
          `The selected model version (${urlVersion}) does not exist for this model. Please select a different version.`
        );
        setSelectedModelId(model.id);
        setSelectedVersionId(null);
      } else {
        setInvalidModelError(null);
        setSelectedModelId(model.id);
        setSelectedVersionId(versionObj.id);
      }
    } else {
      setInvalidModelError(null);
      setSelectedModelId(model.id);
      const latestVer = model.versions?.find((v) => v.isLatest);
      if (latestVer) setSelectedVersionId(latestVer.id);
    }
  };

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

      // When a specific model is already known from the URL, use params passed from
      // the modal (modelType, displayName, version) to avoid a redundant GetAIModel query.
      if (urlModelId) {
        if (urlModelType && urlModelDisplayName) {
          const versionId = urlVersionId ? parseInt(urlVersionId) : null;
          const syntheticModel = {
            id: urlModelId,
            name: urlModelDisplayName,
            displayName: urlModelDisplayName,
            modelType: urlModelType,
            domain: null as string | string[] | null,
            versions: versionId
              ? [{ id: versionId, version: urlVersion || "", isLatest: true, status: "ACTIVE" }]
              : [],
          };
          setAiModels([syntheticModel]);
          applyModelValidation(syntheticModel);
          return;
        }

        // Fallback: fetch from API if URL params are incomplete
        const modelResult = await request<{
          aiModel: {
            id: string;
            name: string;
            displayName: string;
            modelType: string;
            domain?: string | string[] | null;
            versions?: Array<{ id: number; version: string; isLatest: boolean; status: string }>;
          } | null;
        }>(AI_MODEL_BY_ID_QUERY, { modelId: urlModelId }, { organization: orgId });

        const model = modelResult?.aiModel;
        if (!model) {
          setInvalidModelError(
            `The selected model (ID: ${urlModelId}) does not exist or is not available. Please select a different model.`
          );
          setSelectedModelId(null);
          setSelectedVersionId(null);
          return;
        }

        setAiModels([model]);
        applyModelValidation(model);
        return;
      }

      // No model in URL — fetch all models for the selector dropdown
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
      setInvalidModelError(null);

      if (models.length > 0 && !selectedModelId) {
        setSelectedModelId(models[0].id);
        const latestVer = models[0].versions?.find((v) => v.isLatest);
        if (latestVer) setSelectedVersionId(latestVer.id);
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

  // Fetch AI models when authenticated.
  // Skip when urlAuditId is present — model info comes from audit.modelSnapshot via fetchAuditDetails.
  useEffect(() => {
    if (
      isAuthenticated &&
      !isSessionLoading &&
      !urlAuditId &&
      !modelsFetchedRef.current &&
      !isFetchingModelsRef.current
    ) {
      fetchAIModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isSessionLoading, urlAuditId]);

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
          metrics: Array<{ name: string; displayName?: string; mandatoryInputs?: string[] }>;
        }>;
      }>(METRICS_BY_MODEL_TYPE_QUERY, { modelType, domain: auditScope });

      const metricsData = data?.metricsByModelType || [];
      const moduleMetrics = metricsData.find((m: any) => m.name === moduleName);
      if (!moduleMetrics || !moduleMetrics.metrics) {
        return [];
      }

      return moduleMetrics.metrics.map((metric: any) => ({
        value: metric.name,
        label:
          metric.displayName || toTitleCase(metric.name.replace(/_/g, " ")),
        mandatoryInputs: metric.mandatoryInputs || [],
      }));
    } catch (error: any) {
      return [];
    }
  };

  const validateTestCases = (): boolean => {
    if (modeOfEvaluation === "playground") {
      return true;
    }

    const hasPromptLibraries = selectedPromptLibraries.length > 0;
    const hasCustomTestCases = pastedTestCases.trim().length > 0;
    return testSourceMode === "library"
      ? hasPromptLibraries
      : hasCustomTestCases;
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
    if (evaluationStatus === "DRAFT") {
      const saved = await saveDraftProgress();
      if (!saved) return;
    }

    isNavigatingAwayRef.current = true;
    router.push(evaluationsListPath);
  };

  const handleRunAudit = async (): Promise<boolean> => {
    if (!isAuthenticated) {
      setAuditError("Please log in to run an audit.");
      return false;
    }

    if (!validateForm()) {
      setAuditError(
        "Please complete all required evaluation fields before running."
      );
      return false;
    }

    if (!validateTestCases()) {
      setAuditError("Please add test cases before running the evaluation.");
      return false;
    }

    // Ensure we have an audit ID
    let auditId = currentAuditId;

    if (!auditId && selectedModelId) {
      // Create audit if not exists
      auditId = await createBlankAudit(selectedModelId, selectedVersionId);
      if (!auditId) {
        return false;
      }
    }

    if (!auditId) {
      setAuditError("Please select an AI model before running the audit.");
      return false;
    }

    const updated = await updateAuditConfig(auditId);
    if (!updated) {
      return false;
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
        return false;
      }

      if (!payload.success) {
        setAuditError(payload.message || "Failed to start audit.");
        return false;
      }

      const audit = payload.audit || {};

      if (!audit.id) {
        setAuditError("Audit ID not found in response.");
        return false;
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

      return true;
    } catch (error: any) {
      const errorMessage =
        error?.message || "Network error while starting audit.";
      setAuditError(errorMessage);
      return false;
    } finally {
      setIsRequestingAudit(false);
    }
  };

  const draftStatusColors = getEvaluationStatusColor("DRAFT");

  const isCancelDisabled = (() => {
    if (isCancelling) return true;
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(evaluationStatus)) return true;
    if (modeOfEvaluation === "playground") {
      return !["DRAFT", "IN_PROGRESS"].includes(evaluationStatus);
    }
    return !["DRAFT", "PENDING_REVIEW"].includes(evaluationStatus);
  })();

  const getEvaluatorLabel = (type: AuditType) => {
    switch (type) {
      case "Technical":
        return "Technical Evaluator";
      case "Domain":
        return "Domain Expert";
      case "Cultural":
        return "Cultural Expert";
      default:
        return "Evaluator";
    }
  };

  const getModeLabel = (mode: string) => {
    const normalized = mode?.toLowerCase();
    if (normalized === "manual" || normalized === "playground") return "Playground Evaluation";
    if (normalized === "bulk" || normalized === "automated") {
      return "Bulk Evaluation";
    }
    return mode || "--";
  };

  const getScopeDisplayLabel = (scopeValue: string) => {
    if (!scopeValue.trim()) return "--";

    const exactMatch = evaluationScopeOptions.find(
      (option) => option.value === scopeValue,
    );
    if (exactMatch) return exactMatch.label;

    const caseMatch = evaluationScopeOptions.find(
      (option) => option.value.toLowerCase() === scopeValue.toLowerCase(),
    );
    if (caseMatch) return caseMatch.label;

    return toTitleCase(scopeValue.replace(/_/g, " "));
  };

  const overviewScopeLabel = getScopeDisplayLabel(auditScope);

  const overviewModulesLabel =
    Object.entries(selectedModules)
      .filter(([, isSelected]) => isSelected)
      .map(([moduleName]) => getModuleDisplayName(moduleName))
      .join(", ") || "--";

  const displayModelName =
    auditModelName || selectedModel?.displayName || selectedModel?.name || "";
  const displayModelVersion =
    auditModelVersion || selectedVersion?.version || "";

  return (
    <>
      <div
        className={`flex-1 ${styles.auditContent} p-4 sm:p-6 lg:p-10 mt-6 lg:mt-0`}
      >
        {/* Invalid Model/Version Error */}
        {auditError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <Text variant="bodySm" className="text-red-700">
              {auditError}
            </Text>
          </div>
        )}

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

        {/* Evaluation header */}
        <div
          className={`flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ${styles.auditNameSection} mb-8`}
        >
          <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1 evaluation-name-row">
            <Label
              htmlFor="auditName"
              className={`${styles.auditNameLabel} flex-shrink-0 whitespace-nowrap text-left`}
            >
              Evaluation Name :
            </Label>
            <div
              className={`${styles.auditNameInputWrapper} min-w-[220px] flex-1 max-w-[380px]`}
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
            <Tag
              variation="filled"
              fillColor={draftStatusColors.fillColor}
              textColor={draftStatusColors.textColor}
            >
              Draft
            </Tag>
          </div>

          <div
            className={`flex items-center justify-end gap-4 ${styles.auditStatusContainer} flex-shrink-0`}
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
              disabled={isCancelDisabled}
              className={styles.cancelAuditButton}
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

        {!(urlAuditId && isLoadingAuditDetails) && (
          <>
            {!urlModelId && !currentAuditId && (
              <div className="mb-6 max-w-2xl">
                {isLoadingModels ? (
                  <div className="flex flex-col items-center gap-4">
                    <Spinner />
                    <Text variant="bodySm" className="text-gray-600">
                      Loading models...
                    </Text>
                  </div>
                ) : modelsError ? (
                  <Text variant="bodySm" className="text-red-600">
                    {modelsError}
                  </Text>
                ) : aiModels.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          (v) => v.isLatest,
                        );
                        setSelectedVersionId(latestVer?.id || null);
                      }}
                    />
                    {selectedModel?.versions?.length ? (
                      <Select
                        name="versionSelect"
                        label="Select Model Version"
                        options={selectedModel.versions.map((ver) => ({
                          value: String(ver.id),
                          label: `${ver.version}${ver.isLatest ? " (Latest)" : ""}`,
                        }))}
                        value={
                          selectedVersionId ? String(selectedVersionId) : ""
                        }
                        onChange={(value) =>
                          setSelectedVersionId(value ? Number(value) : null)
                        }
                      />
                    ) : null}
                  </div>
                ) : (
                  <Text variant="bodySm" className="text-gray-600">
                    No models available. Please check your backend configuration.
                  </Text>
                )}
              </div>
            )}

            <EvaluationFormOverview
              modelName={displayModelName}
              modelVersion={displayModelVersion}
              organizationName={
                organisationName || organization?.name || "CivicDataLab"
              }
              evalId={
                isCreatingAudit && !currentAuditId
                  ? "..."
                  : currentAuditId || "--"
              }
              createdAt={
                isCreatingAudit && !evaluationCreatedAt
                  ? "..."
                  : evaluationCreatedAt || "--"
              }
              completedAt="--"
              scope={overviewScopeLabel}
              mode={getModeLabel(modeOfEvaluation)}
              evaluator={getEvaluatorLabel(auditType)}
              modules={overviewModulesLabel}
              objective={auditObjective}
            />

            <div
              className={`${styles.evaluationWorkspaceSection} ${
                invalidModelError ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <Text
                variant="headingMd"
                fontWeight="bold"
                className={styles.evaluationWorkspaceTitle}
              >
                Evaluation Workspace
              </Text>

              {modeOfEvaluation !== "playground" && <EvaluationConfiguration
                workspaceOnly
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
              />}

              {modeOfEvaluation === "playground" ? (
                <ManualTestCases
                  auditId={currentAuditId || undefined}
                  modules={buildModulesAndMetrics().modules}
                  moduleMetrics={
                    selectedMetrics as Record<string, SelectOption[]>
                  }
                  modelType={modelType}
                  auditScope={auditScope}
                  orgId={orgId}
                  onRunAudit={handleRunAudit}
                  isRequestingAudit={isRequestingAudit}
                  onTestCaseCountChange={handleManualTestCaseCountChange}
                />
              ) : modeOfEvaluation ? (
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
                  testSourceMode={testSourceMode}
                  setTestSourceMode={setTestSourceMode}
                  selectedModules={selectedModules}
                  selectedMetrics={
                    selectedMetrics as Record<string, SelectOption[]>
                  }
                  onRunAudit={handleRunAudit}
                  isRequestingAudit={isRequestingAudit}
                />
              ) : null}
            </div>
          </>
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
