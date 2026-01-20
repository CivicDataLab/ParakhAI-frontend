"use client";

import BreadCrumbs from "@/components/Breadcrumbs";
import { useGraphQL } from "@/lib/api";
import { useAppSession } from "@/lib/session";
import { toTitleCase } from "@/lib/utils";
import { IconX } from "@tabler/icons-react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button, Icon, Label, Select, Tag, Text, TextField } from "opub-ui";
import { useEffect, useRef, useState } from "react";
import WelcomeSection from "../../../../components/WelcomeSection";
import EvaluationConfiguration from "../components/EvaluationConfiguration";
import EvaluationSummary from "../components/EvaluationSummary";
import ManualTestCases from "../components/ManualTestCases";
import TestCases from "../components/TestCases";
import type { AuditType, Module, SelectOption } from "../components/types";

const GET_ORG_DETAILS = `
  query GetOrgDetails($orgId: ID!) {
    organization(id: $orgId) {
      id
      name
      logoUrl
    }
  }
`;

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

// Mutation to request an audit run from the backend
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

const NewAuditPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";

  const urlModelId = searchParams.get("modelId");

  const [auditType, setAuditType] = useState<AuditType>("technical");
  const [activeTab, setActiveTab] = useState<"config" | "test" | "results">(
    "config"
  );
  const [auditName, setAuditName] = useState(generateDefaultAuditName);
  const isAutoSaved = true;

  // AI Models state
  const [selectedModelId, setSelectedModelId] = useState<string | null>(
    urlModelId
  );
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(
    null
  );
  const [aiModels, setAiModels] = useState<
    Array<{
      id: string;
      name: string;
      displayName: string;
      modelType: string;
      organization?: string;
      versions?: Array<{
        id: number;
        version: string;
        isLatest: boolean;
        status: string;
      }>;
    }>
  >([]);
  const [organization, setOrganization] = useState<{
    name: string;
    logoUrl: string | null;
  } | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Computed values from selected model
  const selectedModel = aiModels.find((m) => m.id === selectedModelId);
  const modelName = selectedModel?.displayName || selectedModel?.name || "";
  // Get version display from selected version or latest version
  const selectedVersion = selectedModel?.versions?.find(
    (v) => v.id === selectedVersionId
  );
  const latestVersion = selectedModel?.versions?.find((v) => v.isLatest);
  const modelVersion = selectedVersion?.version || latestVersion?.version || "";
  const modelType = selectedModel?.modelType || "TEXT_GENERATION"; // Full model type for GraphQL queries

  // GraphQL API hook for authenticated requests
  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
    accessToken,
  } = useGraphQL();

  // Get user session for expert name
  const { user } = useAppSession();

  // Handle tab query parameter on mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "config" ||
      tabParam === "test" ||
      tabParam === "results"
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Form state (no default filled values)
  const [auditorName, setAuditorName] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [auditObjective, setAuditObjective] = useState("");
  const [scopeOfAudit, setScopeOfAudit] = useState("");
  const [modeOfEvaluation, setModeOfEvaluation] = useState<string>("");

  // Prefill organisation name when org details are loaded
  useEffect(() => {
    if (organization?.name && !organisationName) {
      setOrganisationName(organization.name);
    }
  }, [organization?.name, organisationName]);

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
    scopeOfAudit?: string;
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
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditOverview, setAuditOverview] = useState<{
    auditId: string | null;
    auditTime: string | null;
    durationSeconds: number | null;
  } | null>(null);

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleTabChange = (tab: "config" | "test" | "results") => {
    setActiveTab(tab);
    scrollToTop();
  };

  // Helper function to map module name keys to display names
  const getModuleDisplayName = (moduleName: string): string => {
    const nameMap: Record<string, string> = {
      bias_fairness: "Bias and Fairness",
      hallucination: "Hallucination",
      privacy_security: "Privacy and Security",
    };
    return nameMap[moduleName] || toTitleCase(moduleName.replace(/_/g, " "));
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
      isLoadingModules
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

        // Use authenticated GraphQL request - access token is automatically included
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
              // Auto-select all metrics for each module by default
              initialSelectedMetrics[moduleMetrics.name] = metricsOptions;
            }
          });

          setModuleMetricsOptions(initialModuleMetrics);
          setSelectedMetrics(initialSelectedMetrics);
        } catch (metricsError) {
          // Fail silently for metrics prefetch; combobox will still work when metrics are fetched per module
          console.warn("Failed to prefetch metricsByModelType", metricsError);
        }

        // Initialize selected modules state - all selected by default
        const initialSelected: Record<string, boolean> = {};
        if (Array.isArray(modulesData)) {
          modulesData.forEach((module: Module) => {
            if (module?.name) {
              initialSelected[module.name] = true; // Set to true by default

              // If metrics weren't fetched from API, use module.metrics if available
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

        // Update selectedMetrics with any module.metrics that weren't in the API response
        if (Object.keys(initialSelectedMetrics).length > 0) {
          setSelectedMetrics(initialSelectedMetrics);
        }
      } catch (error: any) {
        // Check if it's a connection error
        if (
          error?.message?.includes("Failed to fetch") ||
          error?.message?.includes("ERR_CONNECTION_REFUSED") ||
          error?.message?.includes("Backend server") ||
          error?.message?.includes("NetworkError")
        ) {
          // Use the error message which now includes the actual endpoint URL
          setModulesError(
            error.message ||
              "Backend server is not available. Please check your NEXT_PUBLIC_BACKEND_URL configuration."
          );
          // Don't reset refs on connection error - prevent retry spam
        } else {
          // Show the actual error message for better debugging
          const errorMessage =
            error?.message ||
            error?.response?.errors?.[0]?.message ||
            "Unknown error";
          setModulesError(
            `Failed to load evaluation modules: ${errorMessage}. Please check your authentication and backend configuration.`
          );
          // Reset refs on other errors so it can retry
          modulesFetchedRef.current = false;
        }
      } finally {
        setIsLoadingModules(false);
        isFetchingRef.current = false;
      }
    };

    fetchModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelType, isAuthenticated, isSessionLoading]); // Removed 'request' - it's now memoized and stable

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

      const [modelsResponse, orgResponse] = await Promise.all([
        request<{
          aiModels: Array<{
            id: string;
            name: string;
            displayName: string;
            version: string;
            modelType: string;
            organization?: string;
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
          { organization: params.orgId as string }
        ),
        request(GET_ORG_DETAILS, { orgId: params.orgId }),
      ]);

      const models = modelsResponse?.aiModels || [];
      setAiModels(models);
      if (orgResponse?.organization) {
        setOrganization(orgResponse.organization);
      }

      // Auto-select model based on URL parameter, or first model if available and none selected
      if (models.length > 0 && !selectedModelId) {
        if (urlModelId && models.find((m) => m.id === urlModelId)) {
          setSelectedModelId(urlModelId);
        } else {
          setSelectedModelId(models[0].id);
        }
      } else if (
        urlModelId &&
        models.find((m) => m.id === urlModelId) &&
        selectedModelId !== urlModelId
      ) {
        setSelectedModelId(urlModelId);
      }
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.response?.errors?.[0]?.message ||
        "Unknown error";
      setModelsError(
        `Failed to load AI models: ${errorMessage}. Please check your authentication and backend configuration.`
      );
      modelsFetchedRef.current = false; // Allow retry on error
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

  // Reset modules when model changes (so they refetch with new modelType)
  useEffect(() => {
    if (selectedModelId) {
      modulesFetchedRef.current = false;
      isFetchingRef.current = false;
    }
  }, [selectedModelId]);

  // Fetch metrics for a specific module using metricsByModelType
  const fetchMetricsForModule = async (
    moduleName: string
  ): Promise<SelectOption[]> => {
    if (!isAuthenticated) {
      return [];
    }

    try {
      // Use authenticated GraphQL request - access token is automatically included
      const data = await request<{
        metricsByModelType: Array<{
          name: string;
          metrics: Array<{ name: string; displayName?: string }>;
        }>;
      }>(METRICS_BY_MODEL_TYPE_QUERY, { modelType });

      const metricsData = data?.metricsByModelType || [];

      // Find metrics for the specific module
      const moduleMetrics = metricsData.find((m: any) => m.name === moduleName);
      if (!moduleMetrics || !moduleMetrics.metrics) {
        return [];
      }

      // Convert to SelectOption format
      return moduleMetrics.metrics.map((metric: any) => ({
        value: metric.name,
        label:
          metric.displayName || toTitleCase(metric.name.replace(/_/g, " ")),
      }));
    } catch (error: any) {
      return [];
    }
  };

  /**
   * Validate test cases (for automated mode)
   */
  const validateTestCases = (): boolean => {
    if (modeOfEvaluation === "manual") {
      // Manual mode doesn't require test cases validation
      return true;
    }

    // For automated mode, check if test cases are provided
    const hasPromptLibraries = selectedPromptLibraries.length > 0;
    const hasCustomTestCases =
      (testInputMode === "paste" && pastedTestCases.trim().length > 0) ||
      (testInputMode === "upload" && uploadedFiles.length > 0);
    return hasPromptLibraries || hasCustomTestCases;
  };

  /**
   * Validate all required fields
   */
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!auditorName.trim()) {
      errors.auditorName = "Expert name is required";
    }

    if (!organisationName.trim()) {
      errors.organisationName = "Organisation name is required";
    }

    if (!auditObjective.trim()) {
      errors.auditObjective = "Evaluation objective is required";
    }

    if (!scopeOfAudit.trim()) {
      errors.scopeOfAudit = "Scope of evaluation is required";
    }

    if (!modeOfEvaluation || modeOfEvaluation.trim() === "") {
      errors.modeOfEvaluation = "Mode of evaluation is required";
    }

    // Check if at least one module is selected
    const hasSelectedModules = Object.values(selectedModules).some(
      (isSelected) => isSelected
    );
    if (!hasSelectedModules) {
      errors.modules = "At least one evaluation module must be selected";
    }

    // Check if each selected module has at least one metric selected
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

  /**
   * Validate both form configuration and test cases
   */
  const validateCompleteForm = (): boolean => {
    const isFormValid = validateForm();
    const areTestCasesValid = validateTestCases();
    return isFormValid && areTestCasesValid;
  };

  /**
   * Helper to collect selected modules & metrics based on UI state
   */
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

  /**
   * Call backend GraphQL API to request an audit run.
   * Uses current form values and selected modules/metrics.
   */
  const handleRunAudit = async () => {
    if (!isAuthenticated) {
      setAuditError("Please log in to run an audit.");
      return;
    }

    const { modules, metrics } = buildModulesAndMetrics();

    // Build configuration payload from UI state (kept generic, backend can choose what to use)
    const configuration: any = {
      auditType,
      auditorName,
      organisationName,
      auditObjective,
      scopeOfAudit,
      modeOfEvaluation,
      testInputMode,
      selectedPromptLibraries,
      uploadedFilesCount: uploadedFiles.length,
      pastedTestCasesLength: pastedTestCases.length,
    };

    // Use selected model ID, or fallback to environment variable if available
    const modelId =
      selectedModelId || process.env.NEXT_PUBLIC_AUDIT_MODEL_ID || null;

    if (!modelId) {
      setAuditError("Please select an AI model before running the audit.");
      setIsRequestingAudit(false);
      return;
    }

    let customTestInputs: string | null = null;

    if (testInputMode === "paste" && pastedTestCases.trim()) {
      customTestInputs = pastedTestCases.trim();
    } else if (testInputMode === "upload" && uploadedFiles.length > 0) {
      const fileData = uploadedFiles.map((file) => ({
        filename: file.name,
      }));
      customTestInputs = JSON.stringify(fileData);
    }

    const input: any = {
      name: auditName,
      modules,
      metrics,
      testDatasetIds: selectedPromptLibraries.map((item: any) =>
        String(item.id)
      ),
      customTestInputs: customTestInputs || null,
      configuration,
      modelId,
      modelVersionId: selectedVersionId,
    };

    // Move user into the Audit Results tab and show loading state FIRST
    setActiveTab("results");
    scrollToTop(); // Scroll to top when switching to results tab
    setAuditOverview(null);
    setAuditError(null);
    setIsRequestingAudit(true);

    try {
      // Use authenticated GraphQL request - access token is automatically included
      const result = await request<{
        requestAudit: { success: boolean; message: string; audit: any };
      }>(
        REQUEST_AUDIT_MUTATION,
        { input },
        { organization: params.orgId as string }
      );

      const payload = result?.requestAudit;
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

      // Extract date fields (handle both camelCase and snake_case for compatibility)
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

      // Set audit overview with fetched data
      setAuditOverview({
        auditId: audit.id,
        auditTime: formattedTime,
        durationSeconds,
      });

      // Redirect to the audit detail page with the audit ID in URL
      // This prevents re-triggering the audit on page reload
      router.push(`/${locale}/dashboard/ai-maker/evaluations/${audit.id}`);
      return; // Exit early - the detail page will handle polling

      // Poll for audit completion instead of fixed setTimeout
      const pollInterval = 15000; // Poll every 15 seconds
      const maxPollTime = 300000; // Maximum 5 minutes
      const startTime = Date.now();
      let pollTimeoutId: NodeJS.Timeout | null = null;
      const pollForCompletion = async () => {
        try {
          const refetchResult = await request<{
            audit: {
              id: string;
              startedAt: string | null;
              completedAt: string | null;
              createdAt: string | null;
              status?: string;
            };
          }>(
            `
              query GetAuditById($auditId: ID!) {
                audit(auditId: $auditId) {
                  id
                  startedAt
                  completedAt
                  createdAt
                  status
                }
              }
            `,
            { auditId: audit.id }
          );

          const refetchedAudit = refetchResult?.audit;

          if (refetchedAudit) {
          }
          if (refetchedAudit && refetchedAudit.id === audit.id) {
            const started = refetchedAudit.startedAt
              ? new Date(refetchedAudit.startedAt)
              : null;
            const completed = refetchedAudit.completedAt
              ? new Date(refetchedAudit.completedAt)
              : null;
            const created = refetchedAudit.createdAt
              ? new Date(refetchedAudit.createdAt)
              : null;

            const timeSource = completed || started || created;

            let updatedDurationSeconds: number | null = null;
            if (started && completed) {
              updatedDurationSeconds = Math.round(
                (completed.getTime() - started.getTime()) / 1000
              );
            }

            const updatedFormattedTime =
              timeSource?.toLocaleString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }) || null;

            // Update audit overview with new duration
            setAuditOverview({
              auditId: refetchedAudit.id,
              auditTime: updatedFormattedTime,
              durationSeconds: updatedDurationSeconds,
            });

            // Check if audit is completed
            const isCompleted =
              completed !== null ||
              refetchedAudit.status === "COMPLETED" ||
              refetchedAudit.status === "completed";

            // Continue polling if not completed and within max time
            if (!isCompleted && Date.now() - startTime < maxPollTime) {
              pollTimeoutId = setTimeout(pollForCompletion, pollInterval);
            }
          }
        } catch (error: any) {
          console.error("Error polling audit status:", error);
          // Continue polling on error (might be temporary) if within max time
          if (Date.now() - startTime < maxPollTime) {
            pollTimeoutId = setTimeout(pollForCompletion, pollInterval);
          }
        }
      };

      // Start polling after initial delay
      pollTimeoutId = setTimeout(pollForCompletion, pollInterval);
    } catch (error: any) {
      const errorMessage =
        error?.message || "Network error while starting audit.";
      setAuditError(errorMessage);
    } finally {
      setIsRequestingAudit(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <BreadCrumbs
        data={[
          { href: "/", label: "Home" },
          { href: "/dashboard", label: "User Dashboard" },
          { href: `/${locale}/dashboard/ai-maker`, label: "AI Maker" },
          {
            href: `/${locale}/dashboard/ai-maker/${params.orgId}`,
            label: organization?.name || "Dashboard",
          },
          {
            href: `/${locale}/dashboard/ai-maker/${params.orgId}/evaluations`,
            label: "Evaluations",
          },
          { href: "#", label: "New Evaluation" },
        ]}
      />

      {/* Match AI Maker dashboard layout so sticky nav + breadcrumbs behave the same on all screens */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 overflow-x-visible">
        <div className="flex flex-1 flex-col lg:flex-row gap-6 md:gap-8 lg:-ml-[120px] xl:-ml-[130px] main-content-wrapper">
          <WelcomeSection
            orgName={organization?.name}
            orgLogo={organization?.logoUrl}
          />

          <div className="flex-1 audit-content p-4 sm:p-6 lg:p-10 mt-6 lg:mt-0 bg-white">
            {/* Model Name and Owner Section */}
            <div className="mb-6">
              {/* Model Selector */}
              <div className="mb-4 max-w-md">
                {isLoadingModels ? (
                  <div>
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
                        // Auto-select latest version when model changes
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
                    {/* Version Selector - appears after model selection */}
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
                            selectedVersionId ? String(selectedVersionId) : ""
                          }
                          onChange={(value) =>
                            setSelectedVersionId(value ? Number(value) : null)
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

              {/* Model Name label + value */}
              <div className="mb-4 model-name-container">
                <Text
                  variant="bodySm"
                  className="text-sm leading-5 font-medium text-[#60646C] mb-1 text-right"
                >
                  Model Name
                </Text>
                {/* Single line layout with gap */}
                <div className="flex items-center gap-4">
                  <Text as="h1" className="model-name-text">
                    {modelName}
                  </Text>
                  {modelVersion && (
                    <Text as="h2" className="model-name-text">
                      {modelVersion}
                    </Text>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Text variant="bodyMd">Owner:</Text>
                <Image
                  src="/images/icons/CDL.png"
                  alt="CDL"
                  width={36}
                  height={36}
                  className="object-contain cdl-logo"
                />
              </div>
            </div>

            {/* Audit Name, Tag, and Status Section */}
            <div className="flex items-center justify-between mb-6 gap-4 audit-name-section max-[1023px]:mb-0.5 max-[1023px]:gap-0.5">
              {/* Left side: Label + Input + Tag */}
              <div className="flex items-center gap-4 flex-nowrap min-w-0 flex-1 evaluation-name-row">
                <Label
                  htmlFor="auditName"
                  className="audit-name-label flex-shrink-0 whitespace-nowrap"
                >
                  Evaluation Name
                </Label>
                <div className="audit-name-input-wrapper flex-1 min-w-0 max-w-[380px]">
                  <TextField
                    id="auditName"
                    name="evaluationName"
                    label="Evaluation Name"
                    labelHidden
                    value={auditName}
                    onChange={(value) => setAuditName(value)}
                  />
                </div>
                <div className="flex-shrink-0">
                  <div className="tag-wrapper audit-tag">
                    <Tag
                      variation="filled"
                      fillColor="#E2F5C4"
                      textColor="#0A0704"
                    >
                      {auditType === "technical"
                        ? "Technical Evaluation"
                        : auditType === "domain"
                          ? "Domain Evaluation"
                          : "Cultural Evaluation"}
                    </Tag>
                  </div>
                </div>
              </div>

              {/* Right side: Status */}
              <div className="flex items-center justify-end gap-4 audit-status-container flex-shrink-0 max-[1023px]:gap-0.5 max-[1023px]:mt-0 mr-4">
                {isAutoSaved && (
                  <div className="flex items-center gap-1.5 lg:translate-x-0 xl:translate-x-2">
                    <Text className="audit-auto-saved">Auto-saved</Text>
                    <Image
                      src="/images/icons/circle-check.png"
                      alt="Circle check"
                      width={18}
                      height={18}
                      className="object-contain"
                    />
                  </div>
                )}
                <Button
                  kind="tertiary"
                  variant="critical"
                  onClick={() => {
                    if (
                      confirm("Are you sure you want to cancel this audit?")
                    ) {
                      window.history.back();
                    }
                  }}
                  className="cancel-audit-button flex-shrink-0 max-[640px]:ml-4"
                >
                  Cancel Evaluation
                  <Icon source={IconX} size={18} />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-4 max-[1023px]:mb-3 max-[640px]:mb-2">
              <div className="flex gap-6 max-[1023px]:gap-0 tabs-container">
                <button
                  onClick={() => handleTabChange("config")}
                  className={`audit-config-tab ${
                    activeTab === "config"
                      ? "audit-config-tab-active text-gray-900 font-semibold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent"
                  }`}
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
                  onClick={() => {
                    if (validateForm()) {
                      handleTabChange("test");
                    }
                  }}
                  className={`audit-config-tab ${
                    activeTab === "test"
                      ? "audit-config-tab-active text-gray-900 font-semibold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent"
                  }`}
                >
                  <Text
                    variant="bodyMd"
                    className={
                      activeTab === "test"
                        ? "text-gray-900 font-semibold"
                        : "text-gray-600"
                    }
                  >
                    Test Cases
                  </Text>
                </button>
                <button
                  onClick={() => {
                    if (auditOverview?.auditId) {
                      handleTabChange("results");
                    }
                  }}
                  className={`audit-config-tab ${
                    activeTab === "results"
                      ? "audit-config-tab-active text-gray-900 font-semibold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent"
                  }`}
                  disabled={!auditOverview?.auditId}
                >
                  <Text
                    variant="bodyMd"
                    className={
                      activeTab === "results"
                        ? "text-gray-900 font-semibold"
                        : "text-gray-600"
                    }
                  >
                    Evaluation Summary
                  </Text>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "config" && (
              <EvaluationConfiguration
                auditType={auditType}
                setAuditType={setAuditType}
                auditorName={auditorName}
                setAuditorName={setAuditorName}
                organisationName={organisationName}
                setOrganisationName={setOrganisationName}
                auditObjective={auditObjective}
                setAuditObjective={setAuditObjective}
                scopeOfAudit={scopeOfAudit}
                setScopeOfAudit={setScopeOfAudit}
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
              />
            )}

            {activeTab === "test" &&
              (modeOfEvaluation === "manual" ? (
                <ManualTestCases
                  onPrevious={() => handleTabChange("config")}
                  onRunAudit={handleRunAudit}
                  isRequestingAudit={isRequestingAudit}
                />
              ) : (
                <TestCases
                  selectedPromptLibraries={selectedPromptLibraries}
                  setSelectedPromptLibraries={setSelectedPromptLibraries}
                  uploadedFiles={uploadedFiles}
                  setUploadedFiles={setUploadedFiles}
                  pastedTestCases={pastedTestCases}
                  setPastedTestCases={setPastedTestCases}
                  testInputMode={testInputMode}
                  setTestInputMode={setTestInputMode}
                  onPrevious={() => handleTabChange("config")}
                  onRunAudit={handleRunAudit}
                  isRequestingAudit={isRequestingAudit}
                />
              ))}

            {activeTab === "results" && (
              <EvaluationSummary
                auditOverview={auditOverview}
                isRequestingAudit={isRequestingAudit}
                auditError={auditError}
                onDownloadReport={() => {
                  // TODO: Implement download report functionality
                }}
              />
            )}

            {/* Navigation Buttons - Audit Configuration tab */}
            {activeTab === "config" && (
              <div className="flex items-center justify-center gap-6 pt-8">
                {/* Disabled Previous button on first step, styled like pagination control */}
                <Button
                  kind="secondary"
                  disabled
                  className="previous-button previous-button-disabled"
                >
                  <Image
                    src="/images/icons/circle-arrow-left.png"
                    alt="Circle arrow left"
                    width={18}
                    height={18}
                    className="object-contain previous-icon"
                  />
                  <span className="previous-text">Previous</span>
                </Button>

                <Button
                  kind="secondary"
                  onClick={() => {
                    if (validateForm()) {
                      handleTabChange("test");
                    }
                  }}
                  className="add-test-cases-button"
                >
                  <span className="add-test-cases-text">Add Test Cases</span>
                  <Image
                    src="/images/icons/circle-arrow-right.png"
                    alt="Circle arrow right"
                    width={18}
                    height={18}
                    className="object-contain add-test-cases-icon"
                  />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAuditPage;
