"use client";

import { useGraphQL } from "@/lib/graphql-client";
import type { Audit, RiskDistribution } from "@/features/dashboard/types/audit";
import type { AuditResult } from "@/features/ai-maker/utils/map-audit-results";
import {
  canShowEvaluationResults,
  isAuditInProgress,
  isPlaygroundEvaluationMode,
  parseEvaluatorRecommendation,
  aggregateRiskFromAuditResults,
  resolveRiskDistribution,
  getRiskDistributionTotal,
} from "@/features/dashboard/utils/evaluation";
import {
  GET_AUDIT_QUERY,
  GET_AUDIT_RESULTS_QUERY,
  GET_AUDIT_SUMMARY,
} from "@/features/dashboard/api/evaluation-queries";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

export type UseAuditDataReturn = {
  // server data
  audit: Audit | null;
  auditResults: AuditResult[] | null;
  auditReport: { name: string; size: number | null; url: string } | null;
  riskDistribution: RiskDistribution;
  metricSummary: Record<string, Record<string, { risk_distribution: Record<string, number> }>>;
  evaluatorRecommendation: string;
  evaluationProgress: number | null;
  // loading / error
  isLoading: boolean;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  error: string | null;
  // setters exposed for polling to update shared state
  setAudit: Dispatch<SetStateAction<Audit | null>>;
  setRiskDistribution: Dispatch<SetStateAction<RiskDistribution>>;
  setEvaluationProgress: Dispatch<SetStateAction<number | null>>;
  setEvaluatorRecommendation: Dispatch<SetStateAction<string>>;
  // shared fetch functions (also used by polling / actions)
  fetchAuditSummary: (configurationOverride?: unknown) => Promise<{ hasReport: boolean }>;
  fetchAuditResults: () => Promise<void>;
};

export function useAuditData(
  evaluationId: string,
  orgId?: string
): UseAuditDataReturn {
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
  const [evaluationProgress, setEvaluationProgress] = useState<number | null>(null);
  const [auditResults, setAuditResults] = useState<AuditResult[] | null>(null);
  const [evaluatorRecommendation, setEvaluatorRecommendation] = useState("");

  const isFetchingRef = useRef(false);
  const lastFetchedAuditIdRef = useRef<string | null>(null);

  const requestOptions = orgId ? { organization: orgId } : undefined;

  // ---------------------------------------------------------------------------
  // Reset on evaluationId change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setEvaluatorRecommendation("");
    setEvaluationProgress(null);
    setRiskDistribution({});
    setAuditReport(null);
    setAuditResults(null);
  }, [evaluationId]);

  // ---------------------------------------------------------------------------
  // Shared fetch functions
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

  return {
    audit,
    auditResults,
    auditReport,
    riskDistribution,
    metricSummary,
    evaluatorRecommendation,
    evaluationProgress,
    isLoading,
    isAuthenticated,
    isSessionLoading,
    error,
    setAudit,
    setRiskDistribution,
    setEvaluationProgress,
    setEvaluatorRecommendation,
    fetchAuditSummary,
    fetchAuditResults,
  };
}
