/**
 * Types for manual evaluation flow
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

export interface ManualTestCase {
  id: string;
  module: string;
  subModule?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  inputPrompt: string;
  modelOutput: string;
  status: 'PASSED' | 'FAILED';
  issueType?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  comments?: string;
  idealOutput?: string;
  createdAt: string;
}

export interface CallModelResponse {
  success: boolean;
  message: string;
  output?: string;
  latencyMs?: number;
}

export interface SubmitTestCaseResponse {
  success: boolean;
  message: string;
  testCase?: ManualTestCase;
  moduleProgress?: {
    testCaseCount: number;
    isComplete: boolean;
    canComplete: boolean;
  };
}

export interface LanguageOption {
  value: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'mr', label: 'Marathi' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'or', label: 'Odia' },
  { value: 'as', label: 'Assamese' },
];

export const SEVERITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];
