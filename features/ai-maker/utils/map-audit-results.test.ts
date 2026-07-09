import { beforeEach, describe, expect, it } from 'vitest';
import {
  makeAuditResult,
  makeGroupedAuditResults,
  makePassingResult,
  makeReviewedPassingResult,
  makeReviewedResult,
  resetFixtureCounter,
} from '@/testing/fixtures/bulk-evaluation';
import { isIssueResult, mapAuditResultsToBulkTestCases, mapRiskLevel } from './map-audit-results';

describe('mapRiskLevel', () => {
  it('maps HIGH, MEDIUM, and LOW risk levels', () => {
    expect(mapRiskLevel('HIGH')).toBe('HIGH');
    expect(mapRiskLevel('MEDIUM')).toBe('MEDIUM');
    expect(mapRiskLevel('LOW')).toBe('LOW');
  });

  it('maps partial risk level strings', () => {
    expect(mapRiskLevel('HIGH_RISK')).toBe('HIGH');
    expect(mapRiskLevel('medium_risk')).toBe('MEDIUM');
    expect(mapRiskLevel('low risk')).toBe('LOW');
  });

  it('returns null for no-risk levels', () => {
    expect(mapRiskLevel('NO_RISK')).toBeNull();
    expect(mapRiskLevel('NONE')).toBeNull();
    expect(mapRiskLevel('NO RISK')).toBeNull();
    expect(mapRiskLevel('')).toBeNull();
  });

  it('returns null for null and undefined', () => {
    expect(mapRiskLevel(null)).toBeNull();
    expect(mapRiskLevel(undefined)).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(mapRiskLevel('high')).toBe('HIGH');
    expect(mapRiskLevel('Medium')).toBe('MEDIUM');
  });
});

describe('isIssueResult', () => {
  beforeEach(() => {
    resetFixtureCounter();
  });

  it('returns false when success is true', () => {
    expect(isIssueResult(makePassingResult())).toBe(false);
  });

  it('returns true for failed results with reason', () => {
    expect(isIssueResult(makeAuditResult({ success: false, reason: 'Bias detected' }))).toBe(true);
  });

  it('returns false for reviewed results marked as passing', () => {
    expect(isIssueResult(makeReviewedPassingResult())).toBe(false);
  });

  it('returns true for reviewed results with evaluator risk', () => {
    expect(isIssueResult(makeReviewedResult())).toBe(true);
  });

  it('returns false for reviewed NO_RISK evaluator level', () => {
    expect(
      isIssueResult(
        makeReviewedResult({
          evaluatorSuccess: false,
          evaluatorRiskLevel: 'NO_RISK',
          evaluatorReason: '',
        })
      )
    ).toBe(false);
  });
});

describe('mapAuditResultsToBulkTestCases', () => {
  beforeEach(() => {
    resetFixtureCounter();
  });

  it('returns empty arrays for empty input', () => {
    expect(mapAuditResultsToBulkTestCases([])).toEqual({
      items: [],
      moduleIssueCounts: [],
    });
  });

  it('skips results without a test id', () => {
    const result = makeAuditResult();
    result.task!.test!.id = undefined as unknown as string;

    const { items } = mapAuditResultsToBulkTestCases([result]);
    expect(items).toHaveLength(0);
  });

  it('groups results by test id', () => {
    const grouped = makeGroupedAuditResults('test-group-1');
    const { items } = mapAuditResultsToBulkTestCases(grouped);

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('test-group-1');
    expect(items[0].risks).toHaveLength(2);
    expect(items[0].allMetricResults).toHaveLength(2);
  });

  it('uses first non-empty line as input prompt', () => {
    const grouped = makeGroupedAuditResults('test-prompt');
    const { items } = mapAuditResultsToBulkTestCases(grouped);

    expect(items[0].inputPrompt).toBe('Line one');
    expect(items[0].fullInputText).toContain('Line two prompt');
  });

  it('builds module issue counts from issue results', () => {
    const grouped = makeGroupedAuditResults('test-modules');
    const { moduleIssueCounts } = mapAuditResultsToBulkTestCases(grouped);

    expect(moduleIssueCounts).toHaveLength(2);
    expect(moduleIssueCounts.find((m) => m.moduleId === 'BIAS_FAIRNESS')?.issueCount).toBe(1);
    expect(moduleIssueCounts.find((m) => m.moduleId === 'PRIVACY_SAFETY')?.issueCount).toBe(1);
  });

  it('handles reviewed vs unreviewed risk paths', () => {
    const unreviewed = makeAuditResult({ testId: 'test-a', isReviewed: false });
    const reviewed = makeReviewedResult({ testId: 'test-b' });

    const { items } = mapAuditResultsToBulkTestCases([unreviewed, reviewed]);

    expect(items).toHaveLength(2);
    expect(items[0].risks[0].observation).toBe('Test failure reason');
    expect(items[1].risks[0].observation).toBe('Reviewer noted bias');
  });

  it('defaults missing text fields to em dash', () => {
    const result = makeAuditResult({
      testId: 'empty-text',
      task: {
        id: 'task-empty',
        module: 'BIAS_FAIRNESS',
        test: { id: 'empty-text', testInput: '', actualOutput: '' },
      },
    });

    const { items } = mapAuditResultsToBulkTestCases([result]);
    expect(items[0].inputPrompt).toBe('—');
    expect(items[0].output).toBe('—');
  });
});
