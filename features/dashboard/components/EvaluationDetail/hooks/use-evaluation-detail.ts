"use client";

import { useEffect, useState } from "react";
import {
  isPlaygroundEvaluationMode,
  isAuditInProgress,
  parseEvaluatorRecommendation,
  readRiskCount,
} from "@/features/dashboard/utils/evaluation";
import type { RiskDistribution } from "@/features/dashboard/types/audit";
import { useAuditData } from "./use-audit-data";
import { useAuditPolling } from "./use-audit-polling";
import { useAuditActions } from "./use-audit-actions";

export type UseEvaluationDetailReturn = {
  // data
  audit: ReturnType<typeof useAuditData>["audit"];
  auditResults: ReturnType<typeof useAuditData>["auditResults"];
  auditReport: ReturnType<typeof useAuditData>["auditReport"];
  riskDistribution: RiskDistribution;
  metricSummary: ReturnType<typeof useAuditData>["metricSummary"];
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
    passRate: number | string;
    passRateColor: "success" | "warning" | "default" | undefined;
  };
};

export function useEvaluationDetail(
  evaluationId: string,
  orgId?: string
): UseEvaluationDetailReturn {
  // ── Sub-hooks ──────────────────────────────────────────────────────────────
  const data = useAuditData(evaluationId, orgId);

  const { stopProgressPolling } = useAuditPolling({
    evaluationId,
    orgId,
    audit: data.audit,
    isAuthenticated: data.isAuthenticated,
    isSessionLoading: data.isSessionLoading,
    setAudit: data.setAudit,
    setEvaluationProgress: data.setEvaluationProgress,
    fetchAuditSummary: data.fetchAuditSummary,
    fetchAuditResults: data.fetchAuditResults,
  });

  // ── Orchestrator-owned state ───────────────────────────────────────────────
  const [editableName, setEditableName] = useState("");
  const [modelVersion, setModelVersion] = useState("");
  const [isEvaluationSaved, setIsEvaluationSaved] = useState(false);

  const actions = useAuditActions({
    evaluationId,
    orgId,
    audit: data.audit,
    auditReport: data.auditReport,
    setAudit: data.setAudit,
    setIsEvaluationSaved,
    fetchAuditSummary: data.fetchAuditSummary,
    stopProgressPolling,
  });

  // ── Reset orchestrator state on evaluationId change ────────────────────────
  useEffect(() => {
    setIsEvaluationSaved(false);
  }, [evaluationId]);

  // ── Sync editableName from audit ───────────────────────────────────────────
  useEffect(() => {
    if (!data.audit) return;
    const fallbackName = data.audit.id
      ? `Evaluation #${data.audit.id.slice(0, 8)}`
      : "";
    setEditableName(data.audit.name || fallbackName);

    const recommendationFromConfig = parseEvaluatorRecommendation(
      null,
      data.audit.configuration
    );
    if (recommendationFromConfig) {
      data.setEvaluatorRecommendation(recommendationFromConfig);
      setIsEvaluationSaved(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.audit?.id, data.audit?.name, data.audit?.configuration]);

  // ── Sync modelVersion from audit ───────────────────────────────────────────
  useEffect(() => {
    if (!data.audit?.modelVersionId) {
      setModelVersion("");
      return;
    }
    const snapshot = data.audit.modelSnapshot || {};
    const singleVersion = snapshot.version;
    if (singleVersion && singleVersion.id === data.audit.modelVersionId) {
      setModelVersion(singleVersion.version || "");
    } else {
      const versions: Array<{ id: number; version: string }> =
        snapshot.versions || [];
      const matched = versions.find((v) => v.id === data.audit!.modelVersionId);
      setModelVersion(matched?.version || "");
    }
  }, [data.audit?.modelVersionId, data.audit?.modelSnapshot]);

  // ── Computed values ────────────────────────────────────────────────────────
  const isPlaygroundEvaluation = isPlaygroundEvaluationMode(
    data.audit?.evaluationMode
  );
  const isBulkPendingReview = data.audit?.status === "PENDING_REVIEW";
  const isEvaluationComplete =
    data.audit?.status === "COMPLETED" || Boolean(data.audit?.completedAt);
  const isBulkCompleted =
    !isPlaygroundEvaluation &&
    (data.audit?.status === "COMPLETED" || Boolean(data.audit?.completedAt));
  const isReportReady = Boolean(data.auditReport?.url);
  const showDownloadActions = isPlaygroundEvaluation
    ? isEvaluationComplete
    : isBulkCompleted || isEvaluationSaved;

  const isRunning = isAuditInProgress(data.audit?.status);
  const isPlaygroundInProgress =
    isPlaygroundEvaluationMode(data.audit?.evaluationMode) &&
    data.audit?.status?.toUpperCase() === "IN_PROGRESS";

  const riskSummary = {
    low: readRiskCount(data.riskDistribution, "low"),
    medium: readRiskCount(data.riskDistribution, "medium"),
    high: readRiskCount(data.riskDistribution, "high"),
  };

  const progressPercent = Math.round(data.evaluationProgress ?? 0);

  const auditModelType =
    data.audit?.modelSnapshot?.modelType ||
    data.audit?.modelSnapshot?.model_type ||
    "TEXT_GENERATION";

  const evaluationScopeSource =
    data.audit?.auditScope ||
    data.audit?.configuration?.auditScope ||
    data.audit?.configuration?.audit_scope ||
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

  const getPassRate = (): number | string => {
    if (!data.audit?.totalTests || !data.audit?.passedTests) return 0;
    return ((data.audit.passedTests / data.audit.totalTests) * 100).toFixed(2);
  };

  const getPassRateColor = (): "success" | "warning" | "default" | undefined => {
    if (!data.audit?.totalTests || !data.audit?.passedTests) return undefined;
    const rate = parseFloat(getPassRate().toString());
    if (rate >= 85) return "success";
    if (rate >= 70) return "warning";
    return undefined;
  };

  // ── Primary action dispatcher ──────────────────────────────────────────────
  const handlePrimaryActionClick = () => {
    if (showDownloadActions) {
      if (isReportReady) {
        void actions.downloadReport();
      } else {
        void actions.generateReport();
      }
      return;
    }
    actions.setShowSubmitRecommendationModal(true);
  };

  // ── Bound saveEvaluationName (closes over latest editableName) ─────────────
  const saveEvaluationName = () => actions.saveEvaluationName(editableName);

  return {
    // data
    audit: data.audit,
    auditResults: data.auditResults,
    auditReport: data.auditReport,
    riskDistribution: data.riskDistribution,
    metricSummary: data.metricSummary,
    evaluatorRecommendation: data.evaluatorRecommendation,
    modelVersion,
    editableName,
    evaluationProgress: data.evaluationProgress,
    // loading / error
    isLoading: data.isLoading || data.isSessionLoading,
    error: data.error,
    // action loading states
    isSavingName: actions.isSavingName,
    isSavingEvaluation: actions.isSavingEvaluation,
    isGeneratingReport: actions.isGeneratingReport,
    isDownloading: actions.isDownloading,
    isEvaluationSaved,
    showSubmitRecommendationModal: actions.showSubmitRecommendationModal,
    // setters
    setEditableName,
    setShowSubmitRecommendationModal: actions.setShowSubmitRecommendationModal,
    // handlers
    saveEvaluationName,
    submitBulkReview: actions.submitBulkReview,
    generateReport: actions.generateReport,
    downloadReport: actions.downloadReport,
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
    },
  };
}
