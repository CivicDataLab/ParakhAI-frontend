'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'opub-ui';
import {
  GENERATE_AUDIT_REPORT_QUERY,
  SUBMIT_AUDIT_REVIEW_MUTATION,
  UPDATE_AUDIT_MUTATION,
} from '@/features/dashboard/api/evaluation-queries';
import type { Audit } from '@/features/dashboard/types/audit';
import { useGraphQL } from '@/lib/graphql-client';
import { apiFetch } from '@/lib/rest-client';
import { EVALUATION_STATUS } from '@/constants';

const EVALUATION_NAME_TOAST_ID = 'evaluation-detail-name-save';

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
  isDownloadingExport: boolean;
  showSubmitRecommendationModal: boolean;
  setShowSubmitRecommendationModal: (open: boolean) => void;
  // name receives editableName from the orchestrator so its closure stays fresh
  saveEvaluationName: (editableName: string) => Promise<void>;
  submitBulkReview: (recommendation: string) => Promise<void>;
  generateReport: () => Promise<void>;
  downloadReport: () => Promise<void>;
  downloadExport: () => Promise<void>;
};

const triggerDownload = (href: string, name: string, newTab = false) => {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  if (newTab) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// Reading Content-Disposition cross-origin needs the backend to send
// `Access-Control-Expose-Headers: Content-Disposition`; otherwise this returns null.
const filenameFromDisposition = (disposition: string | null): string | null => {
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    // Plain filenames may contain a literal `%` that is not an escape sequence.
    return match[1];
  }
};

// Some browsers cancel a download if its blob URL is revoked straight after the click.
const BLOB_URL_REVOKE_DELAY_MS = 10_000;

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
  const [isDownloadingExport, setIsDownloadingExport] = useState(false);
  const [showSubmitRecommendationModal, setShowSubmitRecommendationModal] = useState(false);

  const saveEvaluationName = async (editableName: string) => {
    if (!audit || isSavingName) return;
    const trimmedName = editableName?.trim();

    if (!trimmedName) {
      toast.error('Evaluation name is required.', {
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
          result?.updateAudit?.message || 'Failed to save evaluation name on the server.',
          { id: EVALUATION_NAME_TOAST_ID }
        );
      } else if (result.updateAudit.audit?.name) {
        setAudit((prev) => (prev ? { ...prev, name: result.updateAudit.audit!.name } : prev));
        toast.success('Evaluation name saved successfully.', {
          id: EVALUATION_NAME_TOAST_ID,
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save evaluation name. Please try again.',
        { id: EVALUATION_NAME_TOAST_ID }
      );
    } finally {
      setIsSavingName(false);
    }
  };

  const submitBulkReview = async (recommendation: string) => {
    if (!audit || isSavingEvaluation || audit.status !== EVALUATION_STATUS.PENDING_REVIEW) return;

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
        toast.error(reviewResult?.submitAuditReview?.message || 'Failed to submit audit review.');
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

      toast.success('Review submitted successfully.');
      setIsEvaluationSaved(true);
      stopProgressPolling();
      await fetchAuditSummary(audit.configuration);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit review. Please try again.'
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
      }>(GENERATE_AUDIT_REPORT_QUERY, { auditId: evaluationId }, requestOptions);

      if (!reportResult?.generateAuditReport?.success) {
        toast.error('Failed to generate report.');
        return;
      }

      toast.success('Report generated successfully!');
      await fetchAuditSummary(audit?.configuration);
    } catch {
      toast.error('Failed to generate report.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const fetchAuditDownload = async (path: 'report' | 'export') => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/$/, '');
    const headers: Record<string, string> = {};
    if (orgId) headers['organization'] = orgId;

    const res = await apiFetch(`${backendUrl}/api/audits/${evaluationId}/${path}/download/`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.detail || `Download failed (${res.status})`);
    }
    return res;
  };

  const downloadReport = async () => {
    if (!evaluationId || isDownloading) return;
    setIsDownloading(true);
    try {
      // The report endpoint returns { url, name, expires_in }: a short-lived URL to the stored PDF.
      const res = await fetchAuditDownload('report');
      const { url, name } = await res.json();
      triggerDownload(url, name || 'audit_report.pdf', true);
    } catch (err: unknown) {
      console.error('Report download failed:', err);
      toast.error(
        (err instanceof Error && err.message) || 'Failed to download report. Please try again.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // The export endpoint streams a ZIP (overview + every result as JSON), built on the fly from current data.
  const downloadExport = async () => {
    if (!evaluationId || isDownloadingExport) return;
    setIsDownloadingExport(true);
    try {
      const res = await fetchAuditDownload('export');
      const blob = await res.blob();
      const name =
        filenameFromDisposition(res.headers.get('Content-Disposition')) ||
        `EVALUATION_EXPORT_${evaluationId}.zip`;
      const objectUrl = URL.createObjectURL(blob);
      try {
        triggerDownload(objectUrl, name);
      } finally {
        setTimeout(() => URL.revokeObjectURL(objectUrl), BLOB_URL_REVOKE_DELAY_MS);
      }
    } catch (err: unknown) {
      console.error('Evaluation data download failed:', err);
      toast.error(
        (err instanceof Error && err.message) ||
          'Failed to download evaluation data. Please try again.'
      );
    } finally {
      setIsDownloadingExport(false);
    }
  };

  return {
    isSavingName,
    isSavingEvaluation,
    isGeneratingReport,
    isDownloading,
    isDownloadingExport,
    showSubmitRecommendationModal,
    setShowSubmitRecommendationModal,
    saveEvaluationName,
    submitBulkReview,
    generateReport,
    downloadReport,
    downloadExport,
  };
}
