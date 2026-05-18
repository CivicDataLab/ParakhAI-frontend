import { toTitleCase } from "@/lib/utils";
import type { ModuleProgress, SubModuleInfo } from "./types";

export function getTotalManualTestCaseCount(
  moduleProgress: ModuleProgress[] | undefined
): number {
  return (moduleProgress ?? []).reduce((sum, entry) => sum + entry.testCaseCount, 0);
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
