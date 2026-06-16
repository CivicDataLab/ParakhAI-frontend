import { toTitleCase } from "@/lib/utils";
import type { Module } from "../types";
import type {
  ManualEvalWorkspaceDraft,
  ModuleProgress,
  SubModuleInfo,
} from "./types";

const MANUAL_EVAL_WORKSPACE_PREFIX = "manual-eval-workspace";

export const MIN_PLAYGROUND_TEST_CASES = 3;

export function getManualEvalWorkspaceStorageKey(
  orgId: string,
  auditId: string
) {
  return `${MANUAL_EVAL_WORKSPACE_PREFIX}:${orgId}:${auditId}`;
}

export function readManualEvalWorkspaceDraft(
  orgId: string,
  auditId: string
): ManualEvalWorkspaceDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(
      getManualEvalWorkspaceStorageKey(orgId, auditId)
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ManualEvalWorkspaceDraft;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      selectedModule:
        typeof parsed.selectedModule === "string" ? parsed.selectedModule : null,
      sourceLanguage:
        typeof parsed.sourceLanguage === "string" ? parsed.sourceLanguage : "en",
      targetLanguage:
        typeof parsed.targetLanguage === "string" ? parsed.targetLanguage : "",
      inputPrompt:
        typeof parsed.inputPrompt === "string" ? parsed.inputPrompt : "",
      modelOutput:
        typeof parsed.modelOutput === "string" ? parsed.modelOutput : "",
      latencyMs:
        typeof parsed.latencyMs === "number" ? parsed.latencyMs : undefined,
      hasCalledModel: Boolean(parsed.hasCalledModel),
      status:
        parsed.status === "PASSED" || parsed.status === "FAILED"
          ? parsed.status
          : null,
      issueRows: Array.isArray(parsed.issueRows)
        ? parsed.issueRows.filter(
            (row) =>
              row &&
              typeof row === "object" &&
              typeof row.id === "string" &&
              typeof row.issueType === "string" &&
              typeof row.severity === "string" &&
              typeof row.observations === "string" &&
              typeof row.idealOutput === "string"
          )
        : [],
    };
  } catch {
    return null;
  }
}

export function writeManualEvalWorkspaceDraft(
  orgId: string,
  auditId: string,
  draft: ManualEvalWorkspaceDraft
) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      getManualEvalWorkspaceStorageKey(orgId, auditId),
      JSON.stringify(draft)
    );
  } catch {
    // Ignore quota or serialization errors.
  }
}

export function clearManualEvalWorkspaceDraft(orgId: string, auditId: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(
      getManualEvalWorkspaceStorageKey(orgId, auditId)
    );
  } catch {
    // Ignore storage errors.
  }
}

const FALLBACK_MODULE_META: Record<
  string,
  { displayName: string; description: string }
> = {
  HALLUCINATION_MISINFORMATION: {
    displayName: "Hallucination Misinformation",
    description: "Detects false or unsafe outputs",
  },
  BIAS_FAIRNESS: {
    displayName: "Bias Fairness",
    description: "Checks whether model perpetuates stereotypes",
  },
  PRIVACY_SAFETY: {
    displayName: "Privacy Safety",
    description: "Ensures personal data is not exposed",
  },
};

export function getFallbackEvaluationModules(): Module[] {
  return Object.entries(FALLBACK_MODULE_META).map(([name, meta]) => ({
    name,
    displayName: meta.displayName,
    description: meta.description,
    metrics: getFallbackSubModules(name).map((subModule) => ({
      name: subModule.name,
      displayName: subModule.displayName,
      description: subModule.description || "",
    })),
  }));
}

export function getTotalManualTestCaseCount(
  moduleProgress: ModuleProgress[] | undefined
): number {
  return (moduleProgress ?? []).reduce((sum, entry) => sum + entry.testCaseCount, 0);
}

export function metricsToSubModules(
  metrics: Array<{ value: string; label: string }>
): SubModuleInfo[] {
  return metrics
    .filter((metric) => metric.value)
    .map((metric) => ({
      name: metric.value,
      displayName: metric.label || metric.value,
    }));
}

export function getFallbackSubModules(moduleName: string): SubModuleInfo[] {
  const fallbacks: Record<string, SubModuleInfo[]> = {
    BIAS_FAIRNESS: [
      { name: "GENDER_BIAS", displayName: "Gender Bias" },
      { name: "CASTE_BIAS", displayName: "Caste Bias" },
      { name: "REGIONAL_BIAS", displayName: "Regional Bias" },
      { name: "RELIGION_BIAS", displayName: "Religion Bias" },
      { name: "SOCIO_ECONOMIC_BIAS", displayName: "Socio-economic Bias" },
    ],
    HALLUCINATION_MISINFORMATION: [
      { name: "HALLUCINATION", displayName: "Hallucination" },
      { name: "FACTUAL_ERROR", displayName: "Factual Error" },
      { name: "MISLEADING_INFO", displayName: "Misleading Information" },
    ],
    PRIVACY_SAFETY: [
      { name: "PII_LEAKAGE", displayName: "PII Leakage" },
      { name: "UNSAFE_CONTENT", displayName: "Unsafe Content" },
      { name: "TOXICITY", displayName: "Toxicity" },
    ],
  };
  return fallbacks[moduleName] || [];
}

export function resolveIssueDisplayName(
  issueKey: string | undefined | null,
  subModules: SubModuleInfo[],
  moduleName?: string
): string {
  if (!issueKey) return "";

  const fromApi = subModules.find((sm) => sm.name === issueKey)?.displayName;
  if (fromApi) return fromApi;

  if (moduleName) {
    const fromFallback = getFallbackSubModules(moduleName).find(
      (sm) => sm.name === issueKey
    )?.displayName;
    if (fromFallback) return fromFallback;
  }

  return toTitleCase(issueKey.replace(/_/g, " "));
}
