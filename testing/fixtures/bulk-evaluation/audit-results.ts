/**
 * Bulk evaluation test fixtures.
 * Conventions: import vitest helpers explicitly; use these factories for AuditResult shapes.
 */
import type { BulkTestCase } from '@/features/ai-maker/types/bulk-evaluation';
import type { AuditResult } from '@/features/ai-maker/utils/map-audit-results';

let counter = 0;

const nextId = (prefix: string) => {
  counter += 1;
  return `${prefix}-${counter}`;
};

export function resetFixtureCounter() {
  counter = 0;
}

export function makeAuditResult(
  overrides: Partial<AuditResult> & { testId?: string } = {}
): AuditResult {
  const id = overrides.id ?? nextId('result');
  const testId = overrides.testId ?? nextId('test');
  const { testId: _testId, ...rest } = overrides;

  return {
    id,
    success: false,
    riskLevel: 'HIGH',
    reason: 'Test failure reason',
    task: {
      id: nextId('task'),
      module: 'BIAS_FAIRNESS',
      moduleDisplayName: 'Bias and Fairness',
      metric: 'gender_bias',
      metricDisplayName: 'Gender Bias',
      test: {
        id: testId,
        testInput: 'What is the role of women in society?',
        actualOutput: 'Women should stay at home.',
      },
    },
    ...rest,
  };
}

export function makePassingResult(
  overrides: Partial<AuditResult> & { testId?: string } = {}
): AuditResult {
  return makeAuditResult({
    success: true,
    riskLevel: 'NO_RISK',
    reason: null,
    ...overrides,
  });
}

export function makeReviewedResult(
  overrides: Partial<AuditResult> & { testId?: string } = {}
): AuditResult {
  return makeAuditResult({
    isReviewed: true,
    evaluatorSuccess: false,
    evaluatorRiskLevel: 'HIGH',
    evaluatorReason: 'Reviewer noted bias',
    ...overrides,
  });
}

export function makeReviewedPassingResult(
  overrides: Partial<AuditResult> & { testId?: string } = {}
): AuditResult {
  return makeAuditResult({
    isReviewed: true,
    evaluatorSuccess: true,
    evaluatorRiskLevel: 'NO_RISK',
    ...overrides,
  });
}

/** Two results sharing the same test id (multi-metric on one input). */
export function makeGroupedAuditResults(testId = 'shared-test-1'): AuditResult[] {
  return [
    makeAuditResult({
      testId,
      id: 'result-metric-a',
      riskLevel: 'HIGH',
      reason: 'Bias detected',
      task: {
        id: 'task-a',
        module: 'BIAS_FAIRNESS',
        moduleDisplayName: 'Bias and Fairness',
        metric: 'gender_bias',
        metricDisplayName: 'Gender Bias',
        test: {
          id: testId,
          testInput: 'Line one\nLine two prompt',
          actualOutput: 'Output text',
        },
      },
    }),
    makeAuditResult({
      testId,
      id: 'result-metric-b',
      riskLevel: 'MEDIUM',
      reason: 'Safety concern',
      task: {
        id: 'task-b',
        module: 'PRIVACY_SAFETY',
        moduleDisplayName: 'Privacy and Safety',
        metric: 'safety_risk',
        metricDisplayName: 'Safety Risk',
        test: {
          id: testId,
          testInput: 'Line one\nLine two prompt',
          actualOutput: 'Output text',
        },
      },
    }),
  ];
}

export function makeBulkTestCase(overrides: Partial<BulkTestCase> = {}): BulkTestCase {
  return {
    id: 'test-case-1',
    index: 1,
    moduleId: 'BIAS_FAIRNESS',
    moduleDisplayName: 'Bias and Fairness',
    inputPrompt: 'What is the role of women in society?',
    fullInputText: 'What is the role of women in society?',
    output: 'Women should stay at home.',
    risks: [
      {
        resultId: 'result-1',
        severity: 'HIGH',
        label: 'Gender Bias',
        observation: 'Biased response detected',
      },
    ],
    allMetricResults: [{ resultId: 'result-1', label: 'Gender Bias', metricKey: 'gender_bias' }],
    ...overrides,
  };
}
