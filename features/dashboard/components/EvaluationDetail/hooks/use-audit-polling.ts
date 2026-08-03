"use client";

import { useGraphQL } from "@/lib/graphql-client";
import type { Audit } from "@/features/dashboard/types/audit";
import {
  canShowEvaluationResults,
  isAuditInProgress,
  isPlaygroundEvaluationMode,
  isProgressComplete,
  shouldStopPolling,
} from "@/features/dashboard/utils/evaluation";
import { GET_AUDIT_QUERY } from "@/features/dashboard/api/evaluation-queries";
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";

type UseAuditPollingParams = {
  evaluationId: string;
  orgId?: string;
  audit: Audit | null;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  setAudit: Dispatch<SetStateAction<Audit | null>>;
  setEvaluationProgress: Dispatch<SetStateAction<number | null>>;
  fetchAuditSummary: (configurationOverride?: unknown) => Promise<{ hasReport: boolean }>;
  fetchAuditResults: () => Promise<void>;
};

export type UseAuditPollingReturn = {
  stopProgressPolling: () => void;
};

export function useAuditPolling({
  evaluationId,
  orgId,
  audit,
  isAuthenticated,
  isSessionLoading,
  setAudit,
  setEvaluationProgress,
  fetchAuditSummary,
  fetchAuditResults,
}: UseAuditPollingParams): UseAuditPollingReturn {
  const { request } = useGraphQL();
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgressPollingRef = useRef(false);

  const requestOptions = orgId ? { organization: orgId } : undefined;

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

          if (data.audit.status === "FAILED" || data.audit.status === "ERROR") {
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

  // Start polling when audit is in progress
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

  // Cleanup on evaluationId change
  useEffect(() => {
    return () => stopProgressPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationId]);

  return { stopProgressPolling };
}
