"use client";

import { useGraphQL } from "@/lib/graphql-client";
import { apiFetch } from "@/lib/rest-client";
import type { Audit, RiskDistribution } from "@/features/dashboard/types/audit";
import type { AuditResult } from "@/features/ai-maker/utils/map-audit-results";
import {
  canShowEvaluationResults,
  isAuditInProgress,
  isPlaygroundEvaluationMode,
  isProgressComplete,
  parseEvaluatorRecommendation,
  readRiskCount,
  aggregateRiskFromAuditResults,
  resolveRiskDistribution,
  getRiskDistributionTotal,
  shouldStopPolling,
} from "@/features/dashboard/utils/evaluation";
import {
  GET_AUDIT_QUERY,
  GET_AUDIT_RESULTS_QUERY,
  GET_AUDIT_SUMMARY,
  GENERATE_AUDIT_REPORT_QUERY,
  SUBMIT_AUDIT_REVIEW_MUTATION,
  UPDATE_AUDIT_MUTATION,
} from "@/features/dashboard/api/evaluation-queries";
import { useEffect, useRef, useState } from "react";
import { toast } from "opub-ui";

const EVALUATION_NAME_TOAST_ID = "evaluation-detail-name-save";

export type UseEvaluationDetailReturn = {
  // data
  audit: Audit | null;
  auditResults: AuditResult[] | null;
  auditReport: { name: string; size: number | null; url: string } | null;
  riskDistribution: RiskDistribution;
  metricSummary: Record<string, Record<string, { risk_distribution: Record<string, number> }>>;
  evaluatorRecommendation: string;
  modelVersion: string;
  editableName: string;
  evaluationProgress: number | null;
  // loading / error
  isLoading: boolean;
  error: string | null;
  // action loading states
  isSavingName: boolean;
  isSavingEvaluation: boolean;
  isGeneratingReport: boolean;
  isDownloading: boolean;
  isEvaluationSaved: boolean;
  showSubmitRecommendationModal: boolean;
  // setters
  setEditableName: (value: string) => void;
  setShowSubmitRecommendationModal: (open: boolean) => void;
  // handlers
  saveEvaluationName: () => Promise<void>;
  submitBulkReview: (recommendation: string) => Promise<void>;
  generateReport: () => Promise<void>;
  downloadReport: () => Promise<void>;
  handlePrimaryActionClick: () => void;
  // computed
  computed: {
    isPlaygroundEvaluation: boolean;
    isBulkPendingReview: boolean;
    isBulkCompleted: boolean;
    showDownloadActions: boolean;
    isReportReady: boolean;
    isRunning: boolean;
    isPlaygroundInProgress: boolean;
    isEvaluationComplete: boolean;
    riskSummary: { low: number; medium: number; high: number };
    progressPercent: number;
    auditModelType: string;
    evaluationScopeDisplay: string;
  };
};

export function useEvaluationDetail(
  evaluationId: string,
  orgId?: string
): UseEvaluationDetailReturn {
  const { request, isAuthenticated, isLoading: isSessionLoading } = useGraphQL();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [auditReport, setAuditReport] = useState<{
    name: string;
    size: number | null;
    url: string;
  } | null>(null);
  const [riskDistribution, setRiskDistribution] = useState<RiskDistribution>({});
  const [metricSummary, setMetricSummary] = useState<
    Record<string, Record<string, { risk_distribution: Record<string, number> }>>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editableName, setEditableName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState<number | null>(null);
  const [auditResults, setAuditResults] = useState<AuditResult[] | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);
  const [isEvaluationSaved, setIsEvaluationSaved] = useState(false);
  const [showSubmitRecommendationModal, setShowSubmitRecommendationModal] =
    useState(false);
  const [modelVersion, setModelVersion] = useState("");
  const [evaluatorRecommendation, setEvaluatorRecommendation] = useState("");

  const isFetchingRef = useRef(false);
  const lastFetchedAuditIdRef = useRef<string | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgressPollingRef = useRef(false);

  const requestOptions = orgId ? { organization: orgId } : undefined;

  // ---------------------------------------------------------------------------
  // Reset on evaluationId change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setIsEvaluationSaved(false);
    setEvaluatorRecommendation("");
    setEvaluationProgress(null);
    setRiskDistribution({});
    setAuditReport(null);
    setAuditResults(null);
  }, [evaluationId]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const fetchAuditSummary = async (
    configurationOverride?: unknown
  ): Promise<{ hasReport: boolean }> => {
    try {
      const data = await request<{
        auditSummaries: Array<{
          hasReport: boolean;
          riskDistribution: RiskDistribution | null;
          metricSummary: Record<
            string,
            Record<string, { risk_distribution: Record<string, number> }>
          > | null;
          recommendations: unknown;
          auditorComments?: string | null;
          auditReport: { name: string; size: number | null; url: string } | null;
        }>;
      }>(GET_AUDIT_SUMMARY, { audit_id: evaluationId }, requestOptions);

      const summary = data?.auditSummaries?.[0];
      setAuditReport(summary?.auditReport?.url ? summary.auditReport : null);

      if (summary?.metricSummary) {
        setMetricSummary(summary.metricSummary);
      }

      const resolvedRisk = resolveRiskDistribution(
        summary?.riskDistribution,
        summary?.metricSummary
      );
      setRiskDistribution((prev) =>
        getRiskDistributionTotal(resolvedRisk) > 0 ? resolvedRisk : prev
      );

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

  const fetchAuditResults = async () => {
    try {
      const resultsData = await request<{ auditResults: AuditResult[] }>(
        GET_AUDIT_RESULTS_QUERY,
        { auditId: evaluationId, metric: null },
        requestOptions
      );
      const results = resultsData?.auditResults ?? [];
      setAuditResults(results);
      setRiskDistribution((prev) => {
        if (getRiskDistributionTotal(prev) > 0) return prev;
        return aggregateRiskFromAuditResults(results);
      });
    } catch (err) {
      console.error("Error fetching audit results:", err);
      setAuditResults([]);
    }
  };

  // ---------------------------------------------------------------------------
  // Initial fetch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated || isSessionLoading || !evaluationId) return;
    if (isFetchingRef.current || lastFetchedAuditIdRef.current === evaluationId) return;

    isFetchingRef.current = true;

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

        const isPlayground = isPlaygroundEvaluationMode(auditData.audit.evaluationMode);

        if (canShowEvaluationResults(auditData.audit, isPlayground)) {
          await Promise.all([
            fetchAuditSummary(auditData.audit.configuration),
            fetchAuditResults(),
          ]);
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

  // ---------------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------------
  const stopProgressPolling = () => {
    isProgressPollingRef.current = false;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  const scheduleNextPoll = (poll: () => Promise<void>) => {
    pollTimeoutRef.current = setTimeout(() => {
      if (isProgressPollingRef.current) void poll();
    }, 5000);
  };

  const startProgressPolling = () => {
    if (isProgressPollingRef.current) return;
    isProgressPollingRef.current = true;

    const poll = async () => {
      if (!isProgressPollingRef.current) return;

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

          const isPlayground = isPlaygroundEvaluationMode(data.audit.evaluationMode);

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
              await Promise.all([
                fetchAuditSummary(data.audit.configuration),
                fetchAuditResults(),
              ]);
            }
            return;
          }

          if (
            isProgressComplete(data.audit.progressPercentage) &&
            canShowEvaluationResults(data.audit, isPlayground)
          ) {
            stopProgressPolling();
            await Promise.all([
              fetchAuditSummary(data.audit.configuration),
              fetchAuditResults(),
            ]);
            return;
          }
        }

        scheduleNextPoll(poll);
      } catch (err) {
        console.error("Polling error:", err);
        scheduleNextPoll(poll);
      }
    };

    void poll();
  };

  useEffect(() => {
    if (!audit || !isAuthenticated || isSessionLoading) return;

    const isPlayground = isPlaygroundEvaluationMode(audit.evaluationMode);
    const shouldKeepPolling =
      isAuditInProgress(audit.status) && !shouldStopPolling(audit, isPlayground);

    if (!shouldKeepPolling) return;

    startProgressPolling();
    return () => stopProgressPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audit?.status, audit?.evaluationMode, evaluationId, isAuthenticated, isSessionLoading]);

  useEffect(() => {
    return () => stopProgressPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationId]);

  // ---------------------------------------------------------------------------
  // Side effects: sync editableName + modelVersion
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!audit) return;
    const fallbackName = audit.id ? `Evaluation #${audit.id.slice(0, 8)}` : "";
    setEditableName(audit.name || fallbackName);

    const recommendationFromConfig = parseEvaluatorRecommendation(
      null,
      audit.configuration
    );
    if (recommendationFromConfig) {
      setEvaluatorRecommendation(recommendationFromConfig);
      setIsEvaluationSaved(true);
    }
  }, [audit?.id, audit?.name, audit?.configuration]);

  useEffect(() => {
    if (!audit?.modelVersionId) {
      setModelVersion("");
      return;
    }
    const snapshot = audit.modelSnapshot || {};
    const singleVersion = snapshot.version;
    if (singleVersion && singleVersion.id === audit.modelVersionId) {
      setModelVersion(singleVersion.version || "");
    } else {
      const versions: Array<{ id: number; version: string }> =
        snapshot.versions || [];
      const matched = versions.find((v) => v.id === audit.modelVersionId);
      setModelVersion(matched?.version || "");
    }
  }, [audit?.modelVersionId, audit?.modelSnapshot]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const saveEvaluationName = async () => {
    if (!audit || isSavingName) return;
    const trimmedName = editableName?.trim();

    if (!trimmedName) {
      toast.error("Evaluation name is required.", {
        id: EVALUATION_NAME_TOAST_ID,
      });
      return;
    }

    if (trimmedName === audit.name) return;

    try {
      setIsSavingName(true);
      const result = await request<{
        updateAudit: {
          success: boolean;
          message?: string | null;
          audit?: { id: string; name: string };
        };
      }>(
        UPDATE_AUDIT_MUTATION,
        { input: { auditId: audit.id, name: trimmedName } },
        requestOptions
      );

      if (!result?.updateAudit?.success) {
        toast.error(
          result?.updateAudit?.message || "Failed to save evaluation name on the server.",
          { id: EVALUATION_NAME_TOAST_ID }
        );
      } else if (result.updateAudit.audit?.name) {
        setAudit((prev) =>
          prev ? { ...prev, name: result.updateAudit.audit!.name } : prev
        );
        toast.success("Evaluation name saved successfully.", {
          id: EVALUATION_NAME_TOAST_ID,
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save evaluation name. Please try again.",
        { id: EVALUATION_NAME_TOAST_ID }
      );
    } finally {
      setIsSavingName(false);
    }
  };

  const submitBulkReview = async (recommendation: string) => {
    if (!audit || isSavingEvaluation || audit.status !== "PENDING_REVIEW") return;

    setIsSavingEvaluation(true);
    try {
      const reviewResult = await request<{
        submitAuditReview: {
          success: boolean;
          message?: string | null;
          audit?: { id: string; status: string; completedAt: string | null };
        };
      }>(
        SUBMIT_AUDIT_REVIEW_MUTATION,
        {
          input: {
            auditId: audit.id,
            recommendations: recommendation.trim() || null,
          },
        },
        requestOptions
      );

      if (!reviewResult?.submitAuditReview?.success) {
        toast.error(
          reviewResult?.submitAuditReview?.message || "Failed to submit audit review."
        );
        return;
      }

      const updatedAudit = reviewResult.submitAuditReview.audit;
      if (updatedAudit) {
        setAudit((prev) =>
          prev
            ? { ...prev, status: updatedAudit.status, completedAt: updatedAudit.completedAt }
            : prev
        );
      }

      toast.success("Review submitted successfully.");
      setIsEvaluationSaved(true);
      stopProgressPolling();
      await fetchAuditSummary(audit.configuration);
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

  const generateReport = async () => {
    if (!evaluationId || isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      const reportResult = await request<{
        generateAuditReport: { success: boolean; message?: string | null };
      }>(
        GENERATE_AUDIT_REPORT_QUERY,
        { auditId: evaluationId },
        requestOptions
      );

      if (!reportResult?.generateAuditReport?.success) {
        toast.error("Failed to generate report.");
        return;
      }

      toast.success("Report generated successfully!");
      await fetchAuditSummary(audit?.configuration);
    } catch {
      toast.error("Failed to generate report.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadReport = async () => {
    if (!evaluationId || isDownloading) return;
    setIsDownloading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/$/, "");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (orgId) headers["organization"] = orgId;

      const res = await apiFetch(
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

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------
  const isPlaygroundEvaluation = isPlaygroundEvaluationMode(audit?.evaluationMode);
  const isBulkPendingReview = audit?.status === "PENDING_REVIEW";
  const isEvaluationComplete =
    audit?.status === "COMPLETED" || Boolean(audit?.completedAt);
  const isBulkCompleted =
    !isPlaygroundEvaluation &&
    (audit?.status === "COMPLETED" || Boolean(audit?.completedAt));
  const isReportReady = Boolean(auditReport?.url);
  const showDownloadActions = isPlaygroundEvaluation
    ? isEvaluationComplete
    : isBulkCompleted || isEvaluationSaved;

  const isRunning = isAuditInProgress(audit?.status);
  const isPlaygroundInProgress =
    isPlaygroundEvaluationMode(audit?.evaluationMode) &&
    audit?.status?.toUpperCase() === "IN_PROGRESS";

  const riskSummary = {
    low: readRiskCount(riskDistribution, "low"),
    medium: readRiskCount(riskDistribution, "medium"),
    high: readRiskCount(riskDistribution, "high"),
  };

  const progressPercent = Math.round(evaluationProgress ?? 0);

  const auditModelType =
    audit?.modelSnapshot?.modelType ||
    audit?.modelSnapshot?.model_type ||
    "TEXT_GENERATION";

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

  const handlePrimaryActionClick = () => {
    if (showDownloadActions) {
      if (isReportReady) {
        void downloadReport();
      } else {
        void generateReport();
      }
      return;
    }
    setShowSubmitRecommendationModal(true);
  };

  const getPassRate = (): number | string => {
    if (!audit?.totalTests || !audit?.passedTests) return 0;
    return ((audit.passedTests / audit.totalTests) * 100).toFixed(2);
  };

  const getPassRateColor = (): "success" | "warning" | "default" | undefined => {
    if (!audit?.totalTests || !audit?.passedTests) return undefined;
    const passRate = parseFloat(getPassRate().toString());
    if (passRate >= 85) return "success";
    if (passRate >= 70) return "warning";
    return undefined;
  };

  return {
    // data
    audit,
    auditResults,
    auditReport,
    riskDistribution,
    metricSummary,
    evaluatorRecommendation,
    modelVersion,
    editableName,
    evaluationProgress,
    // loading / error
    isLoading: isLoading || isSessionLoading,
    error,
    // action loading states
    isSavingName,
    isSavingEvaluation,
    isGeneratingReport,
    isDownloading,
    isEvaluationSaved,
    showSubmitRecommendationModal,
    // setters
    setEditableName,
    setShowSubmitRecommendationModal,
    // handlers
    saveEvaluationName,
    submitBulkReview,
    generateReport,
    downloadReport,
    handlePrimaryActionClick,
    // computed
    computed: {
      isPlaygroundEvaluation,
      isBulkPendingReview,
      isBulkCompleted,
      showDownloadActions,
      isReportReady,
      isRunning,
      isPlaygroundInProgress,
      isEvaluationComplete,
      riskSummary,
      progressPercent,
      auditModelType,
      evaluationScopeDisplay,
      passRate: getPassRate(),
      passRateColor: getPassRateColor(),
    } as any,
  };
}
