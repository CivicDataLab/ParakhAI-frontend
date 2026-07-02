"use client";

import { useGraphQL } from "@/lib/graphql-client";
import { apiFetch } from "@/lib/rest-client";
import type { Audit } from "@/features/dashboard/types/audit";
import {
  UPDATE_AUDIT_MUTATION,
  SUBMIT_AUDIT_REVIEW_MUTATION,
  GENERATE_AUDIT_REPORT_QUERY,
} from "@/features/dashboard/api/evaluation-queries";
import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "opub-ui";

const EVALUATION_NAME_TOAST_ID = "evaluation-detail-name-save";

type UseAuditActionsParams = {
  evaluationId: string;
  orgId?: string;
  audit: Audit | null;
  auditReport: { name: string; size: number | null; url: string } | null;
  setAudit: Dispatch<SetStateAction<Audit | null>>;
  setIsEvaluationSaved: Dispatch<SetStateAction<boolean>>;
  fetchAuditSummary: (configurationOverride?: unknown) => Promise<{ hasReport: boolean }>;
  stopProgressPolling: () => void;
};

export type UseAuditActionsReturn = {
  isSavingName: boolean;
  isSavingEvaluation: boolean;
  isGeneratingReport: boolean;
  isDownloading: boolean;
  showSubmitRecommendationModal: boolean;
  setShowSubmitRecommendationModal: (open: boolean) => void;
  // name receives editableName from the orchestrator so its closure stays fresh
  saveEvaluationName: (editableName: string) => Promise<void>;
  submitBulkReview: (recommendation: string) => Promise<void>;
  generateReport: () => Promise<void>;
  downloadReport: () => Promise<void>;
};

export function useAuditActions({
  evaluationId,
  orgId,
  audit,
  setAudit,
  setIsEvaluationSaved,
  fetchAuditSummary,
  stopProgressPolling,
}: UseAuditActionsParams): UseAuditActionsReturn {
  const { request } = useGraphQL();
  const requestOptions = orgId ? { organization: orgId } : undefined;

  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSubmitRecommendationModal, setShowSubmitRecommendationModal] =
    useState(false);

  const saveEvaluationName = async (editableName: string) => {
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
          result?.updateAudit?.message ||
            "Failed to save evaluation name on the server.",
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
            ? {
                ...prev,
                status: updatedAudit.status,
                completedAt: updatedAudit.completedAt,
              }
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

  return {
    isSavingName,
    isSavingEvaluation,
    isGeneratingReport,
    isDownloading,
    showSubmitRecommendationModal,
    setShowSubmitRecommendationModal,
    saveEvaluationName,
    submitBulkReview,
    generateReport,
    downloadReport,
  };
}
