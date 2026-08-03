import type { AuditResult } from "@/features/ai-maker/utils/map-audit-results";
import { isIssueResult, mapRiskLevel } from "@/features/ai-maker/utils/map-audit-results";
import type { RiskDistribution } from "@/features/dashboard/types/audit";

// ---------------------------------------------------------------------------
// Audit status guards
// ---------------------------------------------------------------------------

export const isAuditInProgress = (status: string | null | undefined): boolean => {
  const normalized = status?.toUpperCase();
  return (
    normalized === "IN_PROGRESS" ||
    normalized === "QUEUED" ||
    normalized === "PENDING"
  );
};

export const isAuditPendingReview = (status: string | null | undefined): boolean =>
  status?.toUpperCase() === "PENDING_REVIEW";

export const isAuditFailed = (status: string | null | undefined): boolean => {
  const normalized = status?.toUpperCase();
  return normalized === "FAILED" || normalized === "ERROR";
};

export const isPlaygroundEvaluationMode = (mode: string | null | undefined): boolean => {
  const normalized = mode?.toLowerCase();
  return normalized === "manual" || normalized === "playground";
};

export const hasCompletedAuditResults = (audit: {
  status: string;
  completedAt: string | null;
}): boolean => audit.status === "COMPLETED" || Boolean(audit.completedAt);

export const canShowBulkSummaryAndResults = (audit: {
  status: string;
  completedAt: string | null;
}): boolean =>
  hasCompletedAuditResults(audit) || isAuditPendingReview(audit.status);

export const canShowEvaluationResults = (
  audit: { status: string; completedAt: string | null },
  isPlayground: boolean
): boolean =>
  !isAuditFailed(audit.status) &&
  (isPlayground
    ? hasCompletedAuditResults(audit)
    : canShowBulkSummaryAndResults(audit));

export const shouldStopPolling = (
  audit: { status: string; completedAt: string | null },
  isPlayground: boolean
): boolean =>
  hasCompletedAuditResults(audit) ||
  (!isPlayground && isAuditPendingReview(audit.status));

export const isProgressComplete = (progress: number | null | undefined): boolean =>
  typeof progress === "number" && progress >= 100;

// ---------------------------------------------------------------------------
// Display / format helpers
// ---------------------------------------------------------------------------

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

export const getEvaluatorLabel = (auditType: string | null | undefined): string => {
  const normalized = auditType?.toUpperCase().replace(/[\s-]+/g, "_") || "";
  if (normalized.includes("DOMAIN")) return "Domain Expert";
  if (normalized.includes("CULTURAL")) return "Cultural Expert";
  if (normalized.includes("TECHNICAL")) return "Technical Evaluator";
  return auditType || "--";
};

export const getModeLabel = (mode: string | null | undefined): string => {
  const normalized = mode?.toLowerCase();
  if (normalized === "manual" || normalized === "playground") return "Playground Evaluation";
  if (normalized === "bulk" || normalized === "automated") return "Bulk Evaluation";
  return mode || "--";
};

export const formatAuditErrorDetails = (audit: {
  errorDetails: any;
  errorMessage: string | null;
}): string => {
  const { errorDetails, errorMessage } = audit;

  if (typeof errorDetails === "string" && errorDetails.trim()) {
    return errorDetails.trim();
  }

  if (errorDetails && typeof errorDetails === "object") {
    const details = errorDetails as Record<string, unknown>;

    if (Object.keys(details).length > 0) {
      for (const key of ["message", "detail", "error", "description", "errorMessage"]) {
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
        // fall through to errorMessage
      }
    }
  }

  if (typeof errorMessage === "string" && errorMessage.trim()) {
    return errorMessage.trim();
  }

  return "";
};

export const parseEvaluatorRecommendation = (
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
 * Severity tag colors for issues.
 * High → red, Medium → orange/amber, Low → blue.
 * Replaces the duplicate `getRiskTagColors` in AuditResultsList.tsx.
 */
export const getSeverityTagColors = (
  severity: "LOW" | "MEDIUM" | "HIGH" | string
): { fillColor: string; textColor: string } => {
  switch (severity?.toUpperCase()) {
    case "HIGH":
      return { fillColor: "#FEF2F2", textColor: "#E11D48" };
    case "MEDIUM":
      return { fillColor: "#FFFBEB", textColor: "#92400E" };
    case "LOW":
      return { fillColor: "#EFF6FF", textColor: "#2563EB" };
    default:
      return { fillColor: "#F3F4F6", textColor: "#374151" };
  }
};

// ---------------------------------------------------------------------------
// Risk distribution helpers
// ---------------------------------------------------------------------------

export const RISK_LEVEL_KEYS = {
  low: ["LOW_RISK", "LOW", "low_risk", "low"],
  medium: ["MEDIUM_RISK", "MEDIUM", "medium_risk", "medium"],
  high: ["HIGH_RISK", "HIGH", "high_risk", "high"],
} as const;

export const readRiskCount = (
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

export const buildRiskDistribution = (
  low: number,
  medium: number,
  high: number
): RiskDistribution => ({
  LOW_RISK: low,
  MEDIUM_RISK: medium,
  HIGH_RISK: high,
});

export const aggregateRiskFromMetricSummary = (
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

export const aggregateRiskFromAuditResults = (
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

export const resolveRiskDistribution = (
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

export const getRiskDistributionTotal = (distribution: RiskDistribution): number =>
  (distribution.LOW_RISK ?? 0) +
  (distribution.MEDIUM_RISK ?? 0) +
  (distribution.HIGH_RISK ?? 0);
