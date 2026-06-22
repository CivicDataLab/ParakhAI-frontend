export type BulkTestCaseRisk = {
  resultId?: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  label: string;
  observation: string;
};

export type BulkTestCaseResultRef = {
  resultId: string;
  label: string;
  metricKey: string;
};

export type BulkTestCase = {
  id: string;
  index: number;
  moduleId: string;
  moduleDisplayName: string;
  inputPrompt: string;
  fullInputText: string;
  output: string;
  risks: BulkTestCaseRisk[];
  allMetricResults: BulkTestCaseResultRef[];
};

export type ModuleIssueCount = {
  moduleId: string;
  displayName: string;
  issueCount: number;
};

export const ISSUE_TYPE_LABELS = [
  "Gender Bias",
  "Misinformation",
  "Caste Bias",
  "Hallucination",
  "Privacy Violation",
  "Safety Risk",
  "Regional Bias",
  "Age Bias",
] as const;
