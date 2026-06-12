"use client";

import { useGraphQL } from "@/lib/api";
import {
  getEvaluationModeColor,
  getEvaluationStatusColor,
} from "@/lib/statusColors";
import { formatStatusLabel } from "@/lib/utils";
import { IconDownload } from "@tabler/icons-react";
import Link from "next/link";
import {
  Button,
  Icon,
  Spinner,
  Tag,
  Text,
  TextField,
  toast,
} from "opub-ui";
import { useEffect, useRef, useState } from "react";
import EvaluationFormOverview from "../ai-maker/[orgId]/evaluations/components/EvaluationFormOverview";
import RecommendationModal from "../ai-maker/[orgId]/evaluations/components/manual-evaluation/RecommendationModal";
import { useOrganization } from "../ai-maker/[orgId]/OrganizationContext";
import BulkEvaluationResults from "./BulkEvaluationResults";
import PlaygroundEvaluationResults from "./PlaygroundEvaluationResults";

const AI_MODEL_BY_ID_QUERY = `
  query GetAIModel($modelId: ID!) {
    aiModel(modelId: $modelId) {
      id
      versions {
        id
        version
      }
    }
  }
`;

const EVALUATION_NAME_TOAST_ID = "evaluation-detail-name-save";

const GET_AUDIT_QUERY = `
  query GetAudit($auditId: ID!) {
    audit(auditId: $auditId) {
      id
      name
      modelId
      modelName
      status
      modules
      auditScope
      auditObjective
      modelVersionId
      metrics
      configuration
      evaluationMode
      auditType
      totalTests
      passedTests
      failedTests
      skippedTests
      errorMessage
      errorDetails
      createdAt
      startedAt
      completedAt
    }
  }
`;

// GraphQL query to fetch audit summary
const GET_AUDIT_SUMMARY = `
  query GetSummaries($audit_id: ID!)
  {
    auditSummaries(auditId: $audit_id) {
      id
      audit {
        pk
      }
      status
      totalTests
      totalTasks
      totalResults
      aggregationMethod
      riskDistribution
      moduleSummary
      metricSummary 
      toolSummary
      overallVerdict
      verdictReason
      recommendations
      auditorComments
      executiveSummary
      createdAt
      updatedAt
      hasReport
      auditReport {
        name
        size
        url
      }
    }
  }
`;

// Mutation to update an existing audit (same as NewEvaluationContent)
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
        metrics
        modelId
        modelVersionId
        testDatasetIds
        configuration
      }
    }
  }
`;

export type Audit = {
  auditType: string;
  evaluationMode: string;
  auditScope?: string | null;
  auditObjective?: string | null;
  modelVersionId?: number | null;
  id: string;
  name: string;
  modelId: string;
  modelName: string | null;
  status: string;
  modules: string[];
  metrics: string[];
  configuration: any;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  errorMessage: string | null;
  errorDetails: any;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type TestCase = {
  id: string;
  input: string;
  output: string;
  evaluationModule: string;
  evaluationMetric: string;
  riskSeverity: "High" | "Medium" | "Low" | "No risk";
  reason: string;
};

export const formatModuleName = (moduleName: string): string => {
  const moduleMap: Record<string, string> = {
    BIAS_FAIRNESS: "Bias and Fairness",
    HALLUCINATION_MISINFORMATION: "Hallucination and MisInformation",
    PRIVACY_SAFETY: "Privacy and Safety",
  };

  if (moduleMap[moduleName]) {
    return moduleMap[moduleName];
  }

  return moduleName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getEvaluatorLabel = (auditType: string | null | undefined) => {
  const normalized = auditType?.toUpperCase().replace(/[\s-]+/g, "_") || "";
  if (normalized.includes("DOMAIN")) return "Domain Expert";
  if (normalized.includes("CULTURAL")) return "Cultural Expert";
  if (normalized.includes("TECHNICAL")) return "Technical Evaluator";
  return auditType || "--";
};

const isAuditInProgress = (status: string | null | undefined) => {
  const normalized = status?.toUpperCase();
  return (
    normalized === "RUNNING" ||
    normalized === "QUEUED" ||
    normalized === "PENDING"
  );
};

const getModeLabel = (mode: string | null | undefined) => {
  const normalized = mode?.toLowerCase();
  if (normalized === "manual") return "Playground Evaluation";
  if (normalized === "bulk" || normalized === "automated") {
    return "Bulk Evaluation";
  }
  return mode || "--";
};

const parseEvaluatorRecommendation = (
  recommendations: unknown,
  configuration: unknown,
  auditorComments?: string | null
): string => {
  if (typeof recommendations === "string" && recommendations.trim()) {
    return recommendations.trim();
  }

  if (Array.isArray(recommendations)) {
    const joined = recommendations
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text?: string }).text || "");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");

    if (joined.trim()) return joined.trim();
  }

  if (recommendations && typeof recommendations === "object") {
    const record = recommendations as Record<string, unknown>;
    for (const key of ["text", "recommendation", "content", "value"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  const config =
    configuration && typeof configuration === "object"
      ? (configuration as Record<string, unknown>)
      : null;

  if (config) {
    for (const key of [
      "recommendation",
      "evaluatorRecommendation",
      "evaluator_recommendation",
    ]) {
      const value = config[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  if (typeof auditorComments === "string" && auditorComments.trim()) {
    return auditorComments.trim();
  }

  return "";
};

/**
 * Tag colors for issue severity.
 * Matches the old table legend where:
 * - High  => red (#EF4444)
 * - Medium => orange (#F97316)
 * - Low => green (#10B981)
 */
export const getSeverityTagColors = (
  severity: "LOW" | "MEDIUM" | "HIGH"
): { fillColor: string; textColor: string } => {
  switch (severity?.toUpperCase()) {
    case "HIGH":
      // Red
      return { fillColor: "#FEF2F2", textColor: "#E11D48" };
    case "MEDIUM":
      // Orange
      return { fillColor: "#FFFBEB", textColor: "#92400E" };
    case "LOW":
      // Green
      return { fillColor: "#EFF6FF", textColor: "#2563EB" };
    default:
      return { fillColor: "#F3F4F6", textColor: "#374151" };
  }
};

type EvaluationDetailProps = {
  evaluationId: string;
  backLink: string;
  backLinkText?: string;
  newEvaluationLink?: string;
  orgId?: string;
};

const EvaluationDetail = ({
  evaluationId,
  backLink,
  backLinkText = "Back to Evaluations",
  newEvaluationLink,
  orgId,
}: EvaluationDetailProps) => {
  const { organization } = useOrganization();
  const {
    request,
    accessToken,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [auditReport, setAuditReport] = useState<{
    name: string;
    size: number | null;
    url: string;
  } | null>(null);
  const [riskDistribution, setRiskDistribution] = useState<
    Record<string, number>
  >({});
  const [metricSummary, setMetricSummary] = useState<
    Record<
      string,
      Record<string, { risk_distribution: Record<string, number> }>
    >
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editableName, setEditableName] = useState<string>("");
  const [isSavingName, setIsSavingName] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchedAuditIdRef = useRef<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);
  const [isEvaluationSaved, setIsEvaluationSaved] = useState(false);
  const [showSubmitRecommendationModal, setShowSubmitRecommendationModal] =
    useState(false);
  const [modelVersion, setModelVersion] = useState("");
  const [evaluatorRecommendation, setEvaluatorRecommendation] = useState("");
  const isReportReady = Boolean(auditReport?.url);
  const isEvaluationComplete =
    audit?.status === "COMPLETED" || Boolean(audit?.completedAt);
  const isPlaygroundEvaluation =
    audit?.evaluationMode?.toLowerCase() === "manual";
  const showDownloadActions = isEvaluationSaved;

  useEffect(() => {
    setIsEvaluationSaved(false);
    setEvaluatorRecommendation("");
  }, [evaluationId]);

  const submitEvaluation = async (recommendation: string) => {
    if (!audit || isSavingEvaluation || isEvaluationSaved) return;

    setIsSavingEvaluation(true);
    try {
      const requestOptions = orgId ? { organization: orgId } : undefined;
      const existingConfig =
        audit.configuration && typeof audit.configuration === "object"
          ? audit.configuration
          : {};

      const result = await request<{
        updateAudit: {
          success: boolean;
          message?: string | null;
          audit?: { configuration?: unknown };
        };
      }>(
        UPDATE_AUDIT_MUTATION,
        {
          input: {
            auditId: audit.id,
            configuration: {
              ...existingConfig,
              recommendation: recommendation.trim() || null,
            },
          },
        },
        requestOptions
      );

      if (!result?.updateAudit?.success) {
        console.error(
          result?.updateAudit?.message || "Failed to submit evaluation."
        );
        return;
      }

      const trimmed = recommendation.trim();
      setEvaluatorRecommendation(trimmed);
      setAudit((prev) =>
        prev
          ? {
              ...prev,
              configuration: {
                ...existingConfig,
                recommendation: trimmed || null,
              },
            }
          : prev
      );
      setIsEvaluationSaved(true);
      setShowSubmitRecommendationModal(false);
    } catch (err: any) {
      console.error("Submit evaluation failed:", err);
    } finally {
      setIsSavingEvaluation(false);
    }
  };

  const handlePrimaryActionClick = () => {
    if (showDownloadActions) {
      void downloadReport();
      return;
    }

    setShowSubmitRecommendationModal(true);
  };

  const downloadReport = async () => {
    if (!evaluationId || isDownloading) return;
    setIsDownloading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(
        /\/$/,
        ""
      );
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      if (orgId) headers["organization"] = orgId;

      const res = await fetch(
        `${backendUrl}/api/audits/${evaluationId}/report/download/`,
        { method: "GET", headers }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail || `Download failed (${res.status})`);
      }

      const { url, name } = await res.json();
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "audit_report.pdf";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Report download failed:", err);
      alert(err?.message || "Failed to download report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Poll for audit completion
  const startPolling = () => {
    const pollInterval = 15000;
    const maxPollTime = 300000;
    const startTime = Date.now();

    const requestOptions = orgId ? { organization: orgId } : undefined;

    const poll = async () => {
      if (Date.now() - startTime > maxPollTime) return;

      try {
        const data = await request<{ audit: Audit }>(
          GET_AUDIT_QUERY,
          { auditId: evaluationId },
          requestOptions
        );

        if (data?.audit) {
          // Preserve modelName if it exists in current state but not in new data
          setAudit((prev) => ({
            ...data.audit,
            modelName: data.audit.modelName || prev?.modelName || null,
          }));

          if (data.audit.status === "COMPLETED" || data.audit.completedAt) {
            await fetchAuditSummary(data.audit.configuration);
            return;
          }

          if (data.audit.status === "FAILED" || data.audit.status === "ERROR") {
            return;
          }
        }

        setTimeout(poll, pollInterval);
      } catch (err) {
        console.error("Polling error:", err);
        setTimeout(poll, pollInterval);
      }
    };

    setTimeout(poll, pollInterval);
  };

  useEffect(() => {
    if (!isAuthenticated || isSessionLoading || !evaluationId) return;
    if (isFetchingRef.current || lastFetchedAuditIdRef.current === evaluationId)
      return;

    isFetchingRef.current = true;

    const requestOptions = orgId ? { organization: orgId } : undefined;

    const fetchAudit = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const auditData = await request<{ audit: Audit }>(
          GET_AUDIT_QUERY,
          { auditId: evaluationId },
          requestOptions
        );

        if (!auditData?.audit) {
          setError("Evaluation not found");
          return;
        }

        setAudit(auditData.audit);
        lastFetchedAuditIdRef.current = evaluationId;

        if (
          auditData.audit.status === "COMPLETED" ||
          auditData.audit.completedAt
        ) {
          await fetchAuditSummary(auditData.audit.configuration);
        } else if (isAuditInProgress(auditData.audit.status)) {
          startPolling();
        }
      } catch (err: any) {
        console.error("Error fetching audit:", err);
        setError(err?.message || "Failed to load evaluation");
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isSessionLoading, evaluationId, request, orgId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchAuditSummary = async (configurationOverride?: unknown) => {
    const requestOptions = orgId ? { organization: orgId } : undefined;
    try {
      const data = await request<{
        auditSummaries: Array<{
          hasReport: boolean;
          riskDistribution: Record<string, number> | null;
          metricSummary: Record<
            string,
            Record<string, { risk_distribution: Record<string, number> }>
          > | null;
          recommendations: unknown;
          auditorComments?: string | null;
          auditReport: {
            name: string;
            size: number | null;
            url: string;
          } | null;
        }>;
      }>(GET_AUDIT_SUMMARY, { audit_id: evaluationId }, requestOptions);

      const summary = data?.auditSummaries?.[0];
      if (summary?.auditReport) {
        setAuditReport(summary.auditReport);
      }
      if (summary?.riskDistribution) {
        setRiskDistribution(summary.riskDistribution);
      }
      if (summary?.metricSummary) {
        setMetricSummary(summary.metricSummary);
      }
      const recommendationText = parseEvaluatorRecommendation(
        summary?.recommendations,
        configurationOverride ?? audit?.configuration,
        summary?.auditorComments
      );
      if (recommendationText) {
        setEvaluatorRecommendation(recommendationText);
      }
    } catch (err) {
      console.error("Error fetching audit summary:", err);
    }
  };

  const getDuration = () => {
    if (!audit?.startedAt || !audit?.completedAt) return null;
    const start = new Date(audit.startedAt);
    const end = new Date(audit.completedAt);
    const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${seconds}s`;
  };

  const statusColors = getEvaluationStatusColor(audit?.status);
  const evaluationMode = getEvaluationModeColor(audit?.evaluationMode);
  const duration = getDuration();
  const isRunning = isAuditInProgress(audit?.status);
  const evaluationScopeSource =
    audit?.auditScope ||
    audit?.configuration?.auditScope ||
    audit?.configuration?.audit_scope ||
    null;
  const evaluationScopeDisplay = Array.isArray(evaluationScopeSource)
    ? evaluationScopeSource
        .filter(Boolean)
        .map((scope) =>
          String(scope)
            .split("_")
            .map(
              (word: string) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" ")
        )
        .join(", ")
    : evaluationScopeSource
      ? String(evaluationScopeSource)
          .split("_")
          .map(
            (word: string) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" ")
      : "--";

  useEffect(() => {
    if (audit) {
      const fallbackName = audit.id
        ? `Evaluation #${audit.id.slice(0, 8)}`
        : "";
      setEditableName(audit.name || fallbackName);

      const recommendationFromConfig = parseEvaluatorRecommendation(
        null,
        audit.configuration
      );
      if (recommendationFromConfig) {
        setEvaluatorRecommendation(recommendationFromConfig);
        setIsEvaluationSaved(true);
      }
    }
  }, [audit?.id, audit?.name, audit?.configuration]);

  useEffect(() => {
    const fetchModelVersion = async () => {
      if (!audit?.modelId || !audit?.modelVersionId || !isAuthenticated) {
        setModelVersion("");
        return;
      }

      try {
        const requestOptions = orgId ? { organization: orgId } : undefined;
        const data = await request<{
          aiModel: {
            versions?: Array<{ id: number; version: string }>;
          } | null;
        }>(
          AI_MODEL_BY_ID_QUERY,
          { modelId: audit.modelId },
          requestOptions,
        );

        const matchedVersion = data?.aiModel?.versions?.find(
          (version) => version.id === audit.modelVersionId,
        );
        setModelVersion(matchedVersion?.version || "");
      } catch {
        setModelVersion("");
      }
    };

    void fetchModelVersion();
  }, [
    audit?.modelId,
    audit?.modelVersionId,
    isAuthenticated,
    orgId,
    request,
  ]);

  const saveEvaluationName = async () => {
    if (!audit || isSavingName) return;
    const trimmedName = editableName?.trim();

    // Frontend validation: show error toast, do not call backend
    if (!trimmedName) {
      toast.error("Evaluation name is required.", {
        id: EVALUATION_NAME_TOAST_ID,
      });
      return;
    }

    if (trimmedName === audit.name) return;

    try {
      setIsSavingName(true);
      const requestOptions = orgId ? { organization: orgId } : undefined;
      const result = await request<{
        updateAudit: {
          success: boolean;
          message?: string | null;
          audit?: { id: string; name: string };
        };
      }>(
        UPDATE_AUDIT_MUTATION,
        {
          input: {
            auditId: audit.id,
            name: trimmedName,
          },
        },
        requestOptions
      );

      if (!result?.updateAudit?.success) {
        const msg =
          result?.updateAudit?.message ||
          "Failed to save evaluation name on the server.";
        toast.error(msg, { id: EVALUATION_NAME_TOAST_ID });
      } else if (result.updateAudit.audit?.name) {
        setAudit((prev) =>
          prev ? { ...prev, name: result.updateAudit.audit!.name } : prev
        );
        toast.success("Evaluation name saved successfully.", {
          id: EVALUATION_NAME_TOAST_ID,
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save evaluation name. Please try again.";
      toast.error(msg, { id: EVALUATION_NAME_TOAST_ID });
    } finally {
      setIsSavingName(false);
    }
  };

  const getPassRate = () => {
    if (!audit?.totalTests || !audit?.passedTests) return 0;
    return ((audit.passedTests / audit.totalTests) * 100).toFixed(2);
  };
  const getPassRateColor = () => {
    if (!audit?.totalTests || !audit?.passedTests) return "default";
    const passRate = parseFloat(getPassRate().toString());
    if (passRate >= 85) return "success";
    if (passRate >= 70) return "warning";
  };

  const riskSummary = {
    low: riskDistribution["LOW_RISK"] ?? 0,
    medium: riskDistribution["MEDIUM_RISK"] ?? 0,
    high: riskDistribution["HIGH_RISK"] ?? 0,
  };

  const totalIssuesIdentified =
    riskSummary.low + riskSummary.medium + riskSummary.high;

  if (isSessionLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Spinner />
        <Text variant="bodySm" className="text-gray-600">
          Loading evaluation...
        </Text>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Text variant="bodyMd" className="text-red-600 mb-6 font-medium">
          {error || "Evaluation not found"}
        </Text>
        <Link href={backLink}>
          <Button kind="secondary">{backLinkText}</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 text-left">
            <Text
              variant="bodyMd"
              className="text-gray-500 whitespace-nowrap mr-2"
            >
              Evaluation Name :{" "}
            </Text>
            <div
              className="audit-name-input-wrapper max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveEvaluationName();
                }
              }}
            >
              <TextField
                id="evaluationName"
                name="evaluationName"
                label="Evaluation Name"
                labelHidden
                value={editableName}
                onBlur={saveEvaluationName}
                onChange={(value) => setEditableName(value)}
              />
            </div>
          </div>
          <span className="self-start sm:self-auto">
            <Tag
              variation="filled"
              fillColor={statusColors.fillColor}
              textColor={statusColors.textColor}
            >
              {formatStatusLabel(audit.status)}
            </Tag>
          </span>
          <span className="self-start sm:self-auto">
            <Tag
              variation="filled"
              fillColor={evaluationMode.fillColor}
              textColor={evaluationMode.textColor}
            >
              {getModeLabel(audit.evaluationMode)}
            </Tag>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={backLink}
            className="w-full sm:w-auto"
            onClick={() => {
              toast.dismiss();
            }}
          >
            <Button
              kind="secondary"
              className="px-8 py-3 rounded-[8px] font-bold text-base w-full sm:w-auto"
            >
              {backLinkText}
            </Button>
          </Link>
        </div>
      </div>

      {/* Error message */}
      {audit.errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <Text variant="bodySm" className="text-red-800">
            <strong>Error:</strong> {audit.errorMessage}
          </Text>
        </div>
      )}

      <EvaluationFormOverview
        modelName={audit.modelName || "--"}
        modelVersion={modelVersion}
        organizationName={
          organization?.name ||
          (typeof audit.configuration?.organisationName === "string"
            ? audit.configuration.organisationName
            : undefined)
        }
        evalId={audit.id}
        createdAt={formatDate(audit.createdAt)}
        completedAt={formatDate(audit.completedAt)}
        duration={duration || "--"}
        scope={evaluationScopeDisplay}
        mode={getModeLabel(audit.evaluationMode)}
        evaluator={getEvaluatorLabel(audit.auditType)}
        modules={audit.modules?.map(formatModuleName).join(", ") || "--"}
        objective={
          audit.auditObjective ||
          (typeof audit.configuration?.auditObjective === "string"
            ? audit.configuration.auditObjective
            : "") ||
          "--"
        }
      />

      {isRunning && (
        <div className="mb-8 space-y-1">
          <Text variant="bodySm" className="text-gray-600">
            Evaluation results will load once the evaluation is completed.
          </Text>
        </div>
      )}

      {(audit.status === "COMPLETED" || audit.completedAt) && (
        <div className="mb-8">
          <Text variant="headingMd" fontWeight="bold" className="mb-4 block">
            Evaluator&apos;s Recommendations
          </Text>
          <div className="manual-eval-input-panel bg-white p-6">
            <Text
              variant="bodyMd"
              className="whitespace-pre-wrap text-gray-800"
            >
              {evaluatorRecommendation || "No recommendations provided."}
            </Text>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {(audit.status === "COMPLETED" || audit.completedAt) && (
        <div className="mb-8 rounded-2xl border border-[#C4B8F3]">
          <div className="mb-4 sm:mb-5 pl-2">
            <Text variant="headingMd" fontWeight="bold">
              Evaluation Summary
            </Text>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 md:gap-8">
            <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400 text-xs sm:text-sm"
              >
                TOTAL PASS RATE
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  color={getPassRateColor()}
                  className="text-green-600 text-xl sm:text-2xl"
                >
                  {getPassRate() || 0}%
                </Text>
              </div>
            </div>
            <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400 text-xs sm:text-sm"
              >
                TOTAL TEST CASES
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-green-600 text-xl sm:text-2xl"
                >
                  {audit.totalTests || 0}
                </Text>
              </div>
            </div>
            <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400 text-xs sm:text-sm"
              >
                PASSED TESTS
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-green-600 text-xl sm:text-2xl"
                >
                  {audit.passedTests || 0}
                </Text>
              </div>
            </div>
            <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400 text-xs sm:text-sm"
              >
                FAILED TESTS
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-green-600 text-xl sm:text-2xl"
                >
                  {audit.failedTests || 0}
                </Text>
              </div>
            </div>

            <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center sm:col-span-2 md:col-span-1 lg:col-span-1">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400 text-xs sm:text-sm"
              >
                SKIPPED TESTS
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-green-600 text-xl sm:text-2xl"
                >
                  {audit.skippedTests || 0}
                </Text>
              </div>
            </div>
          </div>

          {/* Risk Severity Summary - Total Issues Identified */}
          <div className="mt-6 manual-eval-input-panel p-4 sm:p-6 bg-white">
            <div className="mb-4 flex items-baseline gap-2">
              <Text variant="bodyMd" className="text-gray-900">
                Total Issues Identified:
              </Text>
              <Text variant="bodyMd" className="text-[#E11D48] font-semibold">
                {totalIssuesIdentified}{" "}
                {totalIssuesIdentified === 1 ? "Issue" : "Issues"}
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Low Risk */}
              <div className="rounded-[16px] bg-[#EFF6FF] px-6 py-4 flex flex-col justify-center">
                <Text
                  variant="bodySm"
                  fontWeight="semibold"
                  className="text-xs text-gray-500 mb-2"
                >
                  LOW RISK
                </Text>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-[#2563EB] text-2xl"
                >
                  {riskSummary.low}
                </Text>
              </div>

              {/* Medium Risk */}
              <div className="rounded-[16px] bg-[#FFFBEB] px-6 py-4 flex flex-col justify-center">
                <Text
                  variant="bodySm"
                  fontWeight="semibold"
                  className="text-xs text-gray-500 mb-2"
                >
                  MEDIUM RISK
                </Text>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-[#92400E] text-2xl"
                >
                  {riskSummary.medium}
                </Text>
              </div>

              {/* High Risk */}
              <div className="rounded-[16px] bg-[#FEF2F2] px-6 py-4 flex flex-col justify-center">
                <Text
                  variant="bodySm"
                  fontWeight="semibold"
                  className="text-xs text-gray-500 mb-2"
                >
                  HIGH RISK
                </Text>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-[#E11D48] text-2xl"
                >
                  {riskSummary.high}
                </Text>
              </div>
            </div>
          </div>

          {/* Module-wise Results — temporarily disabled
          {modulesWithVisualizationData.length > 0 && (
            <div className="mt-8 pt-4">
              <div className="mb-4">
                <Text variant="headingMd" fontWeight="bold">
                  Module-wise Results
                </Text>
              </div>

              <div className="mb-4 max-[1023px]:mb-3 bg-white border-solid border-1 border-baseGraySlateAlpha4 rounded-2 max-[640px]:mb-2">
                <Tabs defaultValue={modulesWithVisualizationData[0]}>
                  <TabList>
                    {modulesWithVisualizationData.map((moduleName, index) => (
                      <Tab value={moduleName} key={index}>
                        {formatModuleName(moduleName)}
                      </Tab>
                    ))}
                  </TabList>
                  {modulesWithVisualizationData.map((moduleName, index) => (
                    <TabPanel key={index} value={moduleName}>
                      <div className="mt-5 m-5">
                        <SeverityBarChart
                          issues={[]}
                          metricSummary={metricSummary[moduleName]}
                        />
                      </div>
                    </TabPanel>
                  ))}
                </Tabs>
              </div>
            </div>
          )}
          */}
        </div>
      )}

      {(audit.status === "COMPLETED" || audit.completedAt) &&
        (isPlaygroundEvaluation ? (
          <PlaygroundEvaluationResults
            auditId={evaluationId}
            orgId={orgId}
            modules={audit.modules || []}
          />
        ) : (
          <BulkEvaluationResults auditId={evaluationId} orgId={orgId} />
        ))}

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-4 pt-8">
        <Button
          kind="secondary"
          disabled={
            !isEvaluationComplete ||
            isSavingEvaluation ||
            (showDownloadActions
              ? !isReportReady || isDownloading
              : false)
          }
          icon={
            showDownloadActions ? (
              <Icon
                source={IconDownload}
                size={18}
                className="text-white"
              />
            ) : undefined
          }
          onClick={handlePrimaryActionClick}
          className={
            showDownloadActions
              ? isReportReady
                ? "bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold !font-bold text-base !text-base [&_svg]:text-white [&_svg]:fill-white [&_svg]:stroke-white [&_*]:text-white [&_*]:fill-white [&_*]:stroke-white"
                : "bg-[#6849EE] hover:bg-[#6849EE] hover:!bg-[#6849EE] text-black hover:text-black hover:!text-black px-8 py-3 rounded-[8px] font-bold !font-bold text-base !text-base [&_svg]:text-black [&_svg]:fill-black [&_svg]:stroke-black [&_*]:text-black [&_*]:fill-black [&_*]:stroke-black"
              : "bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold !font-bold text-base !text-base"
          }
        >
          {isSavingEvaluation
            ? "Submitting..."
            : showDownloadActions
              ? isDownloading
                ? "Downloading..."
                : "Download Report"
              : "Submit"}
        </Button>
        <Link href={backLink}>
          <Button
            kind="secondary"
            className="px-8 py-3 rounded-[8px] font-bold text-base"
          >
            {backLinkText}
          </Button>
        </Link>
      </div>

      <RecommendationModal
        open={showSubmitRecommendationModal}
        onOpenChange={setShowSubmitRecommendationModal}
        title="Evaluation Recommendation"
        description="Enter your recommendation for this evaluation (optional)."
        placeholder="Enter your recommendation for this evaluation (optional)"
        onSubmit={submitEvaluation}
        isSubmitting={isSavingEvaluation}
        submitButtonText="Submit"
      />
    </>
  );
};

export default EvaluationDetail;
