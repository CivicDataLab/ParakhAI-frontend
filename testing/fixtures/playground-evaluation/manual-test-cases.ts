import type {
  ManualEvalWorkspaceDraft,
  ManualTestCase,
  ManualTestCaseIssue,
  ModuleProgress,
  PlaygroundEvaluationStatus,
} from '@/features/ai-maker/components/manual-evaluation/types';

export function makeManualTestCaseIssue(
  overrides: Partial<ManualTestCaseIssue> = {}
): ManualTestCaseIssue {
  return {
    metricName: 'GENDER_BIAS',
    status: 'FAILED',
    severity: 'HIGH',
    comments: 'Biased output detected',
    idealOutput: '',
    ...overrides,
  };
}

export function makeManualTestCase(overrides: Partial<ManualTestCase> = {}): ManualTestCase {
  return {
    id: 'manual-test-1',
    testInput: 'What is the role of women in society?',
    actualOutput: 'Women should stay at home.',
    issues: [makeManualTestCaseIssue()],
    createdAt: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

export function makePassingManualTestCase(overrides: Partial<ManualTestCase> = {}): ManualTestCase {
  return makeManualTestCase({
    issues: [{ metricName: 'GENDER_BIAS', status: 'PASSED' }],
    ...overrides,
  });
}

export function makeModuleProgress(overrides: Partial<ModuleProgress> = {}): ModuleProgress {
  return {
    module: 'BIAS_FAIRNESS',
    moduleDisplayName: 'Bias and Fairness',
    testCaseCount: 2,
    isComplete: false,
    canComplete: false,
    passedCount: 1,
    failedCount: 1,
    ...overrides,
  };
}

export function makePlaygroundStatus(
  overrides: Partial<PlaygroundEvaluationStatus> = {}
): PlaygroundEvaluationStatus {
  return {
    auditId: 'playground-audit-1',
    testCaseCount: 2,
    canFinish: false,
    ...overrides,
  };
}

export function makeWorkspaceDraft(
  overrides: Partial<ManualEvalWorkspaceDraft> = {}
): ManualEvalWorkspaceDraft {
  return {
    selectedModule: 'BIAS_FAIRNESS',
    sourceLanguage: 'en',
    targetLanguage: 'hi',
    inputPrompt: 'Test prompt',
    modelOutput: 'Model response',
    hasCalledModel: true,
    status: null,
    issueRows: [
      {
        id: 'issue-row-1',
        issueType: 'GENDER_BIAS',
        severity: 'HIGH',
        observations: 'Bias noted',
        idealOutput: '',
      },
    ],
    ...overrides,
  };
}
