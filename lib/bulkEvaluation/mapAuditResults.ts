import type { BulkTestCase, BulkTestCaseResultRef, BulkTestCaseRisk, ModuleIssueCount } from "./types";
import { toTitleCase } from "@/lib/utils";

export type AuditResultTest = {
  id?: string | null;
  audit?: { pk?: string | number | null } | null;
  testInput?: string | null;
  expectedOutput?: string | null;
  actualOutput?: string | null;
  context?: string | null;
  retrievalContext?: string | null;
  toolsCalled?: unknown;
  expectedTools?: unknown;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type AuditResultTask = {
  id: string;
  audit?: { pk?: string | number | null } | null;
  test?: AuditResultTest | null;
  status?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  metric?: string | null;
  module?: string | null;
  domain?: string | null;
  metricDisplayName?: string | null;
  moduleDisplayName?: string | null;
};

export type AuditResult = {
  id: string;
  task?: AuditResultTask | null;
  name?: string | null;
  success?: boolean | null;
  score?: number | null;
  riskLevel?: string | null;
  reason?: string | null;
  issueDescription?: string | null;
  evaluatorSuccess?: boolean | null;
  evaluatorRiskLevel?: string | null;
  evaluatorReason?: string | null;
  isReviewed?: boolean | null;
  reviewedAt?: string | null;
  metadata?: unknown;
  createdAt?: string | null;
};

const NO_RISK_LEVELS = new Set(["NO_RISK", "NONE", "NO RISK", ""]);

export const mapRiskLevel = (
  riskLevel: string | null | undefined
): BulkTestCaseRisk["severity"] | null => {
  const normalized = (riskLevel || "").toUpperCase().trim();
  if (NO_RISK_LEVELS.has(normalized)) return null;
  if (normalized.includes("HIGH")) return "HIGH";
  if (normalized.includes("MEDIUM")) return "MEDIUM";
  if (normalized.includes("LOW")) return "LOW";
  return null;
};

const toInputPrompt = (testInput: string) => {
  const firstLine = testInput.split("\n").find((line) => line.trim())?.trim();
  return firstLine || testInput.trim();
};

const humanizeKey = (key: string) => toTitleCase(key.replace(/_/g, " "));

const LABEL_FROM = (result: AuditResult) =>
  result.task?.metricDisplayName ||
  (result.task?.metric ? humanizeKey(result.task.metric) : null) ||
  (result.name ? humanizeKey(result.name) : null) ||
  "Issue";

const buildRiskFromResult = (result: AuditResult): BulkTestCaseRisk | null => {
  if (result.isReviewed) {
    // Evaluator has explicitly reviewed — use their values
    if (result.evaluatorSuccess === true) return null;

    const evalRisk = (result.evaluatorRiskLevel || "").toUpperCase().trim();
    if (evalRisk === "NO_RISK" || evalRisk === "NONE" || evalRisk === "NO RISK") {
      return null;
    }

    const severity =
      mapRiskLevel(result.evaluatorRiskLevel) ?? mapRiskLevel(result.riskLevel);
    const resolvedSeverity = severity ?? "LOW";
    const observation =
      result.evaluatorReason || result.reason || result.issueDescription || "";

    if (!observation && result.evaluatorSuccess !== false) return null;

    return {
      resultId: result.id,
      severity: resolvedSeverity,
      label: LABEL_FROM(result),
      observation,
    };
  }

  // Not yet reviewed — use original AI output
  if (result.success === true) return null;

  const severity = mapRiskLevel(result.riskLevel);
  if (!severity && result.success !== false) return null;

  const resolvedSeverity = severity ?? "LOW";
  const observation = result.reason || result.issueDescription || "";

  if (!observation && result.success !== false) return null;

  return {
    resultId: result.id,
    severity: resolvedSeverity,
    label: LABEL_FROM(result),
    observation,
  };
};

export const isIssueResult = (result: AuditResult): boolean =>
  buildRiskFromResult(result) !== null;

export const mapAuditResultsToBulkTestCases = (
  auditResults: AuditResult[]
): { items: BulkTestCase[]; moduleIssueCounts: ModuleIssueCount[] } => {
  const grouped = new Map<string, AuditResult[]>();

  for (const result of auditResults) {
    const testId = result.task?.test?.id;
    if (!testId) continue;

    const existing = grouped.get(testId) ?? [];
    existing.push(result);
    grouped.set(testId, existing);
  }

  const moduleIssueMap = new Map<
    string,
    { displayName: string; issueCount: number }
  >();

  for (const result of auditResults) {
    if (!isIssueResult(result)) continue;

    const moduleId = result.task?.module;
    if (!moduleId) continue;

    const current = moduleIssueMap.get(moduleId) ?? {
      displayName: result.task?.moduleDisplayName || moduleId,
      issueCount: 0,
    };
    current.issueCount += 1;
    moduleIssueMap.set(moduleId, current);
  }

  const items = Array.from(grouped.entries()).map(
    ([testId, results], index) => {
      const primary = results[0];
      const testInput = primary.task?.test?.testInput?.trim() || "";
      const actualOutput = primary.task?.test?.actualOutput?.trim() || "";
      const risks = results
        .map(buildRiskFromResult)
        .filter((risk): risk is BulkTestCaseRisk => risk !== null);

      const allMetricResults: BulkTestCaseResultRef[] = results.map((r) => ({
        resultId: r.id,
        label: r.task?.metricDisplayName || r.task?.metric || r.name || "Issue",
        metricKey: r.task?.metric || r.name || "",
      }));

      return {
        id: testId,
        index: index + 1,
        moduleId: primary.task?.module || "UNKNOWN",
        moduleDisplayName:
          primary.task?.moduleDisplayName || primary.task?.module || "UNKNOWN",
        inputPrompt: toInputPrompt(testInput) || "—",
        fullInputText: testInput || "—",
        output: actualOutput || "—",
        risks,
        allMetricResults,
      };
    }
  );

  const moduleIssueCounts = Array.from(moduleIssueMap.entries()).map(
    ([moduleId, value]) => ({
      moduleId,
      displayName: value.displayName,
      issueCount: value.issueCount,
    })
  );

  return { items, moduleIssueCounts };
};
