/**
 * Types for playground evaluation flow.
 */

export interface SubModuleInfo {
  name: string;
  displayName: string;
  description?: string;
}

export interface ModuleProgress {
  module: string;
  moduleDisplayName: string;
  testCaseCount: number;
  isComplete: boolean;
  canComplete: boolean;
  passedCount: number;
  failedCount: number;
}

export interface ManualEvaluationStatus {
  auditId: number;
  totalModules: number;
  completedModules: number;
  allModulesComplete: boolean;
  canFinishEvaluation: boolean;
  moduleProgress: ModuleProgress[];
}

export interface ManualEvalIssueRowDraft {
  id: string;
  issueType: string;
  severity: string;
  observations: string;
  idealOutput: string;
}

export interface ManualEvalWorkspaceDraft {
  selectedModule: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  inputPrompt: string;
  modelOutput: string;
  latencyMs?: number;
  hasCalledModel: boolean;
  status: "PASSED" | "FAILED" | null;
  issueRows: ManualEvalIssueRowDraft[];
}

export interface ManualTestCase {
  id: string;
  module?: string;
  subModule?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  inputPrompt: string;
  modelOutput: string;
  status: "PASSED" | "FAILED";
  issueType?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH";
  comments?: string;
  idealOutput?: string;
  createdAt: string;
}

export interface LanguageOption {
  value: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "bn", label: "Bengali" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "mr", label: "Marathi" },
  { value: "gu", label: "Gujarati" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
  { value: "pa", label: "Punjabi" },
  { value: "or", label: "Odia" },
  { value: "as", label: "Assamese" },
];

export const SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];
