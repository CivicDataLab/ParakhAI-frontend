import type { BulkTestCase, BulkTestCaseRisk, ModuleIssueCount } from "./types";

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
  comments?: string | null;
  module?: string | null;
  subModule?: string | null;
  severity?: string | null;
  isManual?: boolean | null;
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

const buildRiskFromResult = (result: AuditResult): BulkTestCaseRisk | null => {
  const severity =
    mapRiskLevel(result.evaluatorRiskLevel) ?? mapRiskLevel(result.riskLevel);

  if (!severity) {
    if (result.success === true || result.evaluatorSuccess === true) {
      return null;
    }
  }

  const resolvedSeverity = severity ?? "LOW";
  const observation =
    result.evaluatorReason ||
    result.reason ||
    result.issueDescription ||
    "";

  if (!observation && result.success !== false && result.evaluatorSuccess !== false) {
    return null;
  }

  return {
    severity: resolvedSeverity,
    label:
      result.task?.metricDisplayName ||
      result.task?.metric ||
      result.name ||
      "Issue",
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
    const taskId = result.task?.id;
    if (!taskId) continue;

    const existing = grouped.get(taskId) ?? [];
    existing.push(result);
    grouped.set(taskId, existing);
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
    ([taskId, results], index) => {
      const primary = results[0];
      const testInput = primary.task?.test?.testInput?.trim() || "";
      const actualOutput = primary.task?.test?.actualOutput?.trim() || "";
      const risks = results
        .map(buildRiskFromResult)
        .filter((risk): risk is BulkTestCaseRisk => risk !== null);

      return {
        id: taskId,
        index: index + 1,
        moduleId: primary.task?.module || "UNKNOWN",
        inputPrompt: toInputPrompt(testInput) || "—",
        fullInputText: testInput || "—",
        output: actualOutput || "—",
        risks,
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
