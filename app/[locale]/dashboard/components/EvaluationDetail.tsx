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
import ProgressBar from "@/components/ProgressBar";
import { useEffect, useRef, useState } from "react";
import EvaluationFormOverview from "../ai-maker/[orgId]/evaluations/components/EvaluationFormOverview";
import ManualEvaluationFlow from "../ai-maker/[orgId]/evaluations/components/manual-evaluation";
import RecommendationModal from "../ai-maker/[orgId]/evaluations/components/manual-evaluation/RecommendationModal";
import { useOrganization } from "../ai-maker/[orgId]/OrganizationContext";
import AuditResultsList from "./AuditResultsList";
import SkippedTestsErrorsCard from "./SkippedTestsErrorsCard";
import {
  GET_AUDIT_RESULTS_QUERY,
  SUBMIT_AUDIT_REVIEW_MUTATION,
} from "@/lib/bulkEvaluation/queries";
import type { AuditResult } from "@/lib/bulkEvaluation/mapAuditResults";
import {
  isIssueResult,
  mapRiskLevel,
} from "@/lib/bulkEvaluation/mapAuditResults";

const EVALUATION_NAME_TOAST_ID = "evaluation-detail-name-save";

const GET_AUDIT_QUERY = `
  query GetAudit($auditId: ID!) {
    audit(auditId: $auditId) {
      id
      name
      modelId
      modelName
      modelVersionId
      modelSnapshot
      status
      modules
      auditScope
      auditObjective
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
      progressPercentage
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
  modelSnapshot?: any;
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
  progressPercentage?: number | null;
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

const isAuditPendingReview = (status: string | null | undefined) =>
  status?.toUpperCase() === "PENDING_REVIEW";

const isAuditFailed = (status: string | null | undefined) => {
  const normalized = status?.toUpperCase();
  return normalized === "FAILED" || normalized === "ERROR";
};

const formatAuditErrorDetails = (audit: Audit): string => {
  const { errorDetails, errorMessage } = audit;

  if (typeof errorDetails === "string" && errorDetails.trim()) {
    return errorDetails.trim();
  }

  if (errorDetails && typeof errorDetails === "object") {
    const details = errorDetails as Record<string, unknown>;

    if (Object.keys(details).length > 0) {
      for (const key of [
        "message",
        "detail",
        "error",
        "description",
        "errorMessage",
      ]) {
        const value = details[key];
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }

      try {
        const serialized = JSON.stringify(errorDetails, null, 2);
        if (serialized && serialized !== "{}") {
          return serialized;
        }
      } catch {
        // Fall through to errorMessage.
      }
    }
  }

  if (typeof errorMessage === "string" && errorMessage.trim()) {
    return errorMessage.trim();
  }

  return "";
};

const isPlaygroundEvaluationMode = (mode: string | null | undefined) => {
  const normalized = mode?.toLowerCase();
  return normalized === "manual" || normalized === "playground";
};

const hasCompletedAuditResults = (audit: {
  status: string;
  completedAt: string | null;
}) => audit.status === "COMPLETED" || Boolean(audit.completedAt);

const canShowBulkSummaryAndResults = (audit: {
  status: string;
  completedAt: string | null;
}) =>
  hasCompletedAuditResults(audit) || isAuditPendingReview(audit.status);

const canShowEvaluationResults = (
  audit: { status: string; completedAt: string | null },
  isPlayground: boolean
) =>
  !isAuditFailed(audit.status) &&
  (isPlayground
    ? hasCompletedAuditResults(audit)
    : canShowBulkSummaryAndResults(audit));

const shouldStopPolling = (
  audit: { status: string; completedAt: string | null },
  isPlayground: boolean
) =>
  hasCompletedAuditResults(audit) ||
  (!isPlayground && isAuditPendingReview(audit.status));

const isProgressComplete = (progress: number | null | undefined) =>
  typeof progress === "number" && progress >= 100;

type RiskDistribution = Record<string, number>;

const RISK_LEVEL_KEYS = {
  low: ["LOW_RISK", "LOW", "low_risk", "low"],
  medium: ["MEDIUM_RISK", "MEDIUM", "medium_risk", "medium"],
  high: ["HIGH_RISK", "HIGH", "high_risk", "high"],
} as const;

const readRiskCount = (
  distribution: RiskDistribution | null | undefined,
  level: keyof typeof RISK_LEVEL_KEYS
): number => {
  if (!distribution) return 0;

  for (const key of RISK_LEVEL_KEYS[level]) {
    const value = distribution[key];
    if (typeof value === "number") return value;
  }

  return 0;
};

const buildRiskDistribution = (
  low: number,
  medium: number,
  high: number
): RiskDistribution => ({
  LOW_RISK: low,
  MEDIUM_RISK: medium,
  HIGH_RISK: high,
});

const aggregateRiskFromMetricSummary = (
  metricSummary:
    | Record<string, { risk_distribution?: RiskDistribution }>
    | null
    | undefined
): RiskDistribution => {
  let low = 0;
  let medium = 0;
  let high = 0;

  for (const entry of Object.values(metricSummary ?? {})) {
    const dist = entry?.risk_distribution;
    low += readRiskCount(dist, "low");
    medium += readRiskCount(dist, "medium");
    high += readRiskCount(dist, "high");
  }

  return buildRiskDistribution(low, medium, high);
};

const aggregateRiskFromAuditResults = (
  auditResults: AuditResult[]
): RiskDistribution => {
  let low = 0;
  let medium = 0;
  let high = 0;

  for (const result of auditResults) {
    if (!isIssueResult(result)) continue;

    const severity =
      mapRiskLevel(result.evaluatorRiskLevel) ??
      mapRiskLevel(result.riskLevel) ??
      "LOW";

    if (severity === "HIGH") high += 1;
    else if (severity === "MEDIUM") medium += 1;
    else low += 1;
  }

  return buildRiskDistribution(low, medium, high);
};

const resolveRiskDistribution = (
  riskDistribution: RiskDistribution | null | undefined,
  metricSummary:
    | Record<string, { risk_distribution?: RiskDistribution }>
    | null
    | undefined
): RiskDistribution => {
  const fromTopLevel = buildRiskDistribution(
    readRiskCount(riskDistribution, "low"),
    readRiskCount(riskDistribution, "medium"),
    readRiskCount(riskDistribution, "high")
  );

  const topLevelTotal =
    fromTopLevel.LOW_RISK + fromTopLevel.MEDIUM_RISK + fromTopLevel.HIGH_RISK;
  if (topLevelTotal > 0) return fromTopLevel;

  return aggregateRiskFromMetricSummary(metricSummary);
};

const getRiskDistributionTotal = (distribution: RiskDistribution) =>
  (distribution.LOW_RISK ?? 0) +
  (distribution.MEDIUM_RISK ?? 0) +
  (distribution.HIGH_RISK ?? 0);

const getModeLabel = (mode: string | null | undefined) => {
  const normalized = mode?.toLowerCase();
  if (normalized === "manual" || normalized === "playground") return "Playground Evaluation";
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
  orgId?: string;
};

const EvaluationDetail = ({
  evaluationId,
  backLink,
  backLinkText = "Back to Evaluations",
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
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgressPollingRef = useRef(false);
  const isFinalisationPollingRef = useRef(false);
  const [evaluationProgress, setEvaluationProgress] = useState<number | null>(
    null
  );
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
  const isPlaygroundEvaluation = isPlaygroundEvaluationMode(audit?.evaluationMode);
  const isBulkPendingReview = audit?.status === "PENDING_REVIEW";
  const isBulkCompleted =
    !isPlaygroundEvaluation &&
    (audit?.status === "COMPLETED" || Boolean(audit?.completedAt));
  const showDownloadActions = isPlaygroundEvaluation
    ? isEvaluationComplete
    : isBulkCompleted || isEvaluationSaved;
  const isAwaitingReport = showDownloadActions && !isReportReady;

  useEffect(() => {
    setIsEvaluationSaved(false);
    setEvaluatorRecommendation("");
    setEvaluationProgress(null);
    setRiskDistribution({});
    setAuditReport(null);
  }, [evaluationId]);

  const submitBulkReview = async (recommendation: string) => {
    if (!audit || isSavingEvaluation || audit.status !== "PENDING_REVIEW") return;

    setIsSavingEvaluation(true);
    try {
      const requestOptions = orgId ? { organization: orgId } : undefined;
      const reviewResult = await request<{
        submitAuditReview: {
          success: boolean;
          message?: string | null;
          audit?: {
            id: string;
            status: string;
            completedAt: string | null;
          };
        };
      }>(
        SUBMIT_AUDIT_REVIEW_MUTATION,
        { input: { auditId: audit.id, recommendations: recommendation.trim() || null } },
        requestOptions
      );

      if (!reviewResult?.submitAuditReview?.success) {
        toast.error(
          reviewResult?.submitAuditReview?.message ||
            "Failed to submit audit review."
        );
        return;
      }

      const updatedAudit = reviewResult.submitAuditReview.audit;
      if (updatedAudit) {
        setAudit((prev) =>
          prev
            ? {
                ...prev,
                status: updatedAudit.status,
                completedAt: updatedAudit.completedAt,
              }
            : prev
        );
      }

      toast.success("Review submitted. Generating report…");
      setIsEvaluationSaved(true);
      stopProgressPolling();
      startFinalisationPolling();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to submit review. Please try again."
      );
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

        const isPlayground = isPlaygroundEvaluationMode(
          auditData.audit.evaluationMode
        );

        if (canShowEvaluationResults(auditData.audit, isPlayground)) {
          const { hasReport } = await fetchAuditSummary(
            auditData.audit.configuration,
            auditData.audit
          );
          if (hasCompletedAuditResults(auditData.audit) && !hasReport) {
            startFinalisationPolling();
          }
        } else if (isAuditInProgress(auditData.audit.status)) {
          setEvaluationProgress(
            typeof auditData.audit.progressPercentage === "number"
              ? auditData.audit.progressPercentage
              : 0
          );
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

  const fetchAuditSummary = async (
    configurationOverride?: unknown,
    auditOverride?: Pick<Audit, "evaluationMode">
  ): Promise<{ hasReport: boolean }> => {
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
      if (summary?.auditReport?.url) {
        setAuditReport(summary.auditReport);
      } else {
        setAuditReport(null);
      }
      if (summary?.metricSummary) {
        setMetricSummary(summary.metricSummary);
      }

      let resolvedRisk = resolveRiskDistribution(
        summary?.riskDistribution,
        summary?.metricSummary
      );

      const evaluationMode =
        auditOverride?.evaluationMode ?? audit?.evaluationMode;
      const isBulkEvaluation = !isPlaygroundEvaluationMode(evaluationMode);

      if (getRiskDistributionTotal(resolvedRisk) === 0 && isBulkEvaluation) {
        try {
          const resultsData = await request<{ auditResults: AuditResult[] }>(
            GET_AUDIT_RESULTS_QUERY,
            { auditId: evaluationId, metric: null },
            requestOptions
          );
          resolvedRisk = aggregateRiskFromAuditResults(
            resultsData?.auditResults ?? []
          );
        } catch (resultsError) {
          console.error(
            "Error fetching audit results for risk summary:",
            resultsError
          );
        }
      }

      setRiskDistribution(resolvedRisk);

      const recommendationText = parseEvaluatorRecommendation(
        summary?.recommendations,
        configurationOverride ?? audit?.configuration,
        summary?.auditorComments
      );
      if (recommendationText) {
        setEvaluatorRecommendation(recommendationText);
      }

      return { hasReport: Boolean(summary?.auditReport?.url) };
    } catch (err) {
      console.error("Error fetching audit summary:", err);
      return { hasReport: false };
    }
  };

  const stopProgressPolling = () => {
    isProgressPollingRef.current = false;
    if (!isFinalisationPollingRef.current && pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  const stopFinalisationPolling = () => {
    isFinalisationPollingRef.current = false;
    if (!isProgressPollingRef.current && pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  const stopAllPolling = () => {
    isProgressPollingRef.current = false;
    isFinalisationPollingRef.current = false;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  const scheduleNextPoll = (
    poll: () => Promise<void>,
    pollingRef: { current: boolean }
  ) => {
    pollTimeoutRef.current = setTimeout(() => {
      if (pollingRef.current) {
        void poll();
      }
    }, 5000);
  };

  const startProgressPolling = () => {
    if (isProgressPollingRef.current) return;

    isProgressPollingRef.current = true;
    const requestOptions = orgId ? { organization: orgId } : undefined;

    const poll = async () => {
      if (!isProgressPollingRef.current) {
        return;
      }

      try {
        const data = await request<{ audit: Audit }>(
          GET_AUDIT_QUERY,
          { auditId: evaluationId },
          requestOptions
        );

        if (data?.audit) {
          if (typeof data.audit.progressPercentage === "number") {
            setEvaluationProgress(data.audit.progressPercentage);
          }

          setAudit((prev) => ({
            ...data.audit,
            modelName: data.audit.modelName || prev?.modelName || null,
          }));

          const isPlayground = isPlaygroundEvaluationMode(
            data.audit.evaluationMode
          );

          if (
            data.audit.status === "FAILED" ||
            data.audit.status === "ERROR"
          ) {
            stopProgressPolling();
            return;
          }

          if (shouldStopPolling(data.audit, isPlayground)) {
            stopProgressPolling();
            if (canShowEvaluationResults(data.audit, isPlayground)) {
              await fetchAuditSummary(data.audit.configuration, data.audit);
            }
            return;
          }

          if (
            isProgressComplete(data.audit.progressPercentage) &&
            canShowEvaluationResults(data.audit, isPlayground)
          ) {
            stopProgressPolling();
            await fetchAuditSummary(data.audit.configuration, data.audit);
            return;
          }
        }

        scheduleNextPoll(poll, isProgressPollingRef);
      } catch (err) {
        console.error("Polling error:", err);
        scheduleNextPoll(poll, isProgressPollingRef);
      }
    };

    void poll();
  };

  const startFinalisationPolling = () => {
    if (isFinalisationPollingRef.current) return;

    isFinalisationPollingRef.current = true;
    const requestOptions = orgId ? { organization: orgId } : undefined;

    const poll = async () => {
      if (!isFinalisationPollingRef.current) {
        return;
      }

      try {
        const data = await request<{ audit: Audit }>(
          GET_AUDIT_QUERY,
          { auditId: evaluationId },
          requestOptions
        );

        if (data?.audit) {
          setAudit((prev) => ({
            ...data.audit,
            modelName: data.audit.modelName || prev?.modelName || null,
          }));

          if (
            data.audit.status === "FAILED" ||
            data.audit.status === "ERROR"
          ) {
            stopFinalisationPolling();
            return;
          }
        }

        const auditForSummary = data?.audit ?? audit;
        const { hasReport } = await fetchAuditSummary(
          auditForSummary?.configuration,
          auditForSummary ?? undefined
        );

        if (
          auditForSummary &&
          hasCompletedAuditResults(auditForSummary) &&
          hasReport
        ) {
          stopFinalisationPolling();
          return;
        }

        scheduleNextPoll(poll, isFinalisationPollingRef);
      } catch (err) {
        console.error("Finalisation polling error:", err);
        scheduleNextPoll(poll, isFinalisationPollingRef);
      }
    };

    void poll();
  };

  useEffect(() => {
    if (!audit || !isAuthenticated || isSessionLoading) return;

    const isPlayground = isPlaygroundEvaluationMode(audit.evaluationMode);
    const shouldKeepPolling =
      isAuditInProgress(audit.status) &&
      !shouldStopPolling(audit, isPlayground);

    if (!shouldKeepPolling) return;

    startProgressPolling();

    return () => {
      stopProgressPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audit?.status, audit?.evaluationMode, evaluationId, isAuthenticated, isSessionLoading]);

  useEffect(() => {
    if (!audit || !isAuthenticated || isSessionLoading) return;
    if (!hasCompletedAuditResults(audit)) return;
    if (isReportReady) return;
    if (isFinalisationPollingRef.current) return;

    startFinalisationPolling();

    return () => {
      stopFinalisationPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    audit?.status,
    audit?.completedAt,
    evaluationId,
    isAuthenticated,
    isReportReady,
    isSessionLoading,
  ]);

  useEffect(() => {
    return () => {
      stopAllPolling();
    };
  }, [evaluationId]);

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
  const isPlaygroundInProgress =
    isPlaygroundEvaluationMode(audit?.evaluationMode) &&
    audit?.status?.toUpperCase() === "IN_PROGRESS";
  const auditModelType =
    audit?.modelSnapshot?.modelType ||
    audit?.modelSnapshot?.model_type ||
    "TEXT_GENERATION";
  const progressPercent = Math.round(evaluationProgress ?? 0);
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
    if (!audit?.modelVersionId) {
      setModelVersion("");
      return;
    }
    const snapshot = audit.modelSnapshot || {};
    // API returns either a single `version` object or a legacy `versions` array
    const singleVersion = snapshot.version;
    if (singleVersion && singleVersion.id === audit.modelVersionId) {
      setModelVersion(singleVersion.version || "");
    } else {
      const versions: Array<{ id: number; version: string }> = snapshot.versions || [];
      const matched = versions.find((v) => v.id === audit.modelVersionId);
      setModelVersion(matched?.version || "");
    }
  }, [audit?.modelVersionId, audit?.modelSnapshot]);

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
    low: readRiskCount(riskDistribution, "low"),
    medium: readRiskCount(riskDistribution, "medium"),
    high: readRiskCount(riskDistribution, "high"),
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

      {isPlaygroundInProgress && orgId && (
        <ManualEvaluationFlow
          auditId={evaluationId}
          modules={audit.modules || []}
          modelType={auditModelType}
          orgId={orgId}
          onFinishAudit={() => {}}
          isRequestingAudit={false}
        />
      )}

      {isAuditFailed(audit.status) && (
        <div className="mb-8 mt-6">
          <Text
            variant="bodyMd"
            fontWeight="bold"
            className="mb-3 block text-[#DC2626]"
          >
            Evaluation failed
          </Text>
          <Text variant="bodyMd" className="mb-3 block text-gray-900">
            None of the test cases returned a response from the model.
          </Text>
          <Text variant="bodyMd" className="mb-4 block text-gray-900">
            This may be caused by a temporary connectivity issue, server outage,
            or model unavailability. Please try a new evaluation after some
            time.
          </Text>
          <Text
            variant="bodyMd"
            fontWeight="semibold"
            className="mb-1 block text-gray-900"
          >
            Error details:
          </Text>
          <Text
            variant="bodyMd"
            className="block whitespace-pre-wrap text-gray-500"
          >
            {formatAuditErrorDetails(audit) || "No additional details available."}
          </Text>
        </div>
      )}

      {isRunning && (
        <div className="mb-8 flex flex-col gap-2">
          <Text variant="bodySm" className="block text-gray-600">
            Evaluation results will load once the evaluation is completed.
          </Text>
          <Text variant="bodySm" className="block text-gray-600">
            Evaluation Progress : {progressPercent}%
          </Text>
          <ProgressBar
            value={progressPercent}
            max={100}
            color="highlight"
            size="small"
          />
        </div>
      )}

      {(audit.status === "COMPLETED" || audit.completedAt) &&
        !isAuditFailed(audit.status) && (
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
      {canShowEvaluationResults(audit, isPlaygroundEvaluation) && (
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

      {canShowEvaluationResults(audit, isPlaygroundEvaluation) && (
        <AuditResultsList
          auditId={evaluationId}
          orgId={orgId}
          isEditable={!isPlaygroundEvaluation && isBulkPendingReview}
          bannerVariant={
            isPlaygroundEvaluation || !isBulkPendingReview
              ? "reviewed"
              : "pending"
          }
        />
      )}

      {/* Action Buttons */}
      {!isAuditFailed(audit.status) && !isPlaygroundInProgress && (
      <>
      <div className="flex flex-col items-center gap-4 pt-8">
        {!showDownloadActions &&
          !isPlaygroundEvaluation &&
          isBulkPendingReview &&
          !isSavingEvaluation && (
          <Text variant="bodyMd" color="critical" className="text-center">
            Ready to submit? Submitting will finalise this evaluation. This action cannot be undone.
          </Text>
        )}
        {(!isPlaygroundEvaluation || showDownloadActions) && (
        <Button
          kind="secondary"
          disabled={
            isSavingEvaluation ||
            (showDownloadActions
              ? !isReportReady || isDownloading
              : !isBulkPendingReview)
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
                : isAwaitingReport
                  ? "Generating Report..."
                  : "Download Report"
              : "Submit"}
        </Button>
        )}
        {isAwaitingReport && (
          <Text variant="bodySm" className="text-gray-600 text-center">
            Your report is being generated. This button will enable automatically
            when it is ready.
          </Text>
        )}
        <Link href={backLink}>
          <Button
            kind="secondary"
            className="px-8 py-3 rounded-[8px] font-bold text-base"
          >
            {backLinkText}
          </Button>
        </Link>
      </div>

      {!isPlaygroundEvaluation && (audit.skippedTests || 0) > 0 && (
        <SkippedTestsErrorsCard
          errorMessage={
            audit.errorMessage?.trim() || "No additional error details available."
          }
        />
      )}
      </>
      )}

      <RecommendationModal
        open={showSubmitRecommendationModal}
        onOpenChange={setShowSubmitRecommendationModal}
        title="Evaluation Recommendation"
        description="Enter your recommendation for this evaluation."
        placeholder="Enter your recommendation for this evaluation"
        onSubmit={submitBulkReview}
        isSubmitting={isSavingEvaluation}
        submitButtonText="Submit"
      />
    </>
  );
};

export default EvaluationDetail;
