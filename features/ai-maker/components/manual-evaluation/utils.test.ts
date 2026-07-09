import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeManualTestCase,
  makeModuleProgress,
  makeWorkspaceDraft,
} from '@/testing/fixtures/playground-evaluation';
import type { ManualTestCaseIssue } from './types';
import {
  clearManualEvalWorkspaceDraft,
  formatRiskLabel,
  getFailedManualTestCaseIssues,
  getFallbackEvaluationModules,
  getFallbackSubModules,
  getIssueRiskTagColors,
  getManualEvalWorkspaceStorageKey,
  getTotalManualTestCaseCount,
  isManualTestCasePassed,
  metricsToSubModules,
  MIN_PLAYGROUND_TEST_CASES,
  normalizeIssueSeverity,
  readManualEvalWorkspaceDraft,
  resolveIssueDisplayName,
  writeManualEvalWorkspaceDraft,
} from './utils';

describe('normalizeIssueSeverity', () => {
  it('maps HIGH, MEDIUM, and LOW', () => {
    expect(normalizeIssueSeverity('HIGH')).toBe('HIGH');
    expect(normalizeIssueSeverity('medium_risk')).toBe('MEDIUM');
    expect(normalizeIssueSeverity('low')).toBe('LOW');
  });

  it('returns null for empty or unknown values', () => {
    expect(normalizeIssueSeverity('')).toBeNull();
    expect(normalizeIssueSeverity(null)).toBeNull();
    expect(normalizeIssueSeverity('UNKNOWN')).toBeNull();
  });
});

describe('getIssueRiskTagColors', () => {
  it('returns severity-specific colors', () => {
    expect(getIssueRiskTagColors('HIGH').textColor).toBe('#E11D48');
    expect(getIssueRiskTagColors('MEDIUM').textColor).toBe('#92400E');
    expect(getIssueRiskTagColors('LOW').textColor).toBe('#2563EB');
  });

  it('returns default colors for unknown severity', () => {
    expect(getIssueRiskTagColors('UNKNOWN').fillColor).toBe('#F3F4F6');
  });
});

describe('formatRiskLabel', () => {
  it('formats severity and label together', () => {
    expect(formatRiskLabel('HIGH', 'Gender Bias')).toBe('High risk - Gender Bias');
  });

  it('returns label only when severity is missing', () => {
    expect(formatRiskLabel(null, 'Gender Bias')).toBe('Gender Bias');
  });
});

describe('getFailedManualTestCaseIssues', () => {
  it('excludes PASSED issues', () => {
    const issues: ManualTestCaseIssue[] = [
      { metricName: 'GENDER_BIAS', status: 'PASSED' },
      { metricName: 'CASTE_BIAS', status: 'FAILED', severity: 'HIGH' },
    ];
    expect(getFailedManualTestCaseIssues(issues)).toHaveLength(1);
  });

  it('treats issues with content as failed when status is not PASSED', () => {
    const issues: ManualTestCaseIssue[] = [
      { metricName: '', status: '', severity: 'LOW', comments: 'Issue noted' },
    ];
    expect(getFailedManualTestCaseIssues(issues)).toHaveLength(1);
  });

  it('ignores empty non-failed issues', () => {
    const issues: ManualTestCaseIssue[] = [{ metricName: '', status: '' }];
    expect(getFailedManualTestCaseIssues(issues)).toHaveLength(0);
  });
});

describe('isManualTestCasePassed', () => {
  it('returns true when no failed issues remain', () => {
    expect(isManualTestCasePassed(makeManualTestCase({ issues: [] }))).toBe(true);
    expect(
      isManualTestCasePassed(
        makeManualTestCase({ issues: [{ metricName: 'GENDER_BIAS', status: 'PASSED' }] })
      )
    ).toBe(true);
  });

  it('returns false when failed issues exist', () => {
    expect(isManualTestCasePassed(makeManualTestCase())).toBe(false);
  });
});

describe('workspace draft sessionStorage helpers', () => {
  const orgId = 'org-1';
  const auditId = 'audit-1';

  beforeEach(() => {
    sessionStorage.clear();
  });

  it('builds a stable storage key', () => {
    expect(getManualEvalWorkspaceStorageKey(orgId, auditId)).toBe(
      'manual-eval-workspace:org-1:audit-1'
    );
  });

  it('round-trips a valid draft', () => {
    const draft = makeWorkspaceDraft();
    writeManualEvalWorkspaceDraft(orgId, auditId, draft);

    expect(readManualEvalWorkspaceDraft(orgId, auditId)).toEqual(draft);
  });

  it('returns null for malformed JSON', () => {
    sessionStorage.setItem(getManualEvalWorkspaceStorageKey(orgId, auditId), '{bad json');
    expect(readManualEvalWorkspaceDraft(orgId, auditId)).toBeNull();
  });

  it('sanitizes invalid draft fields', () => {
    sessionStorage.setItem(
      getManualEvalWorkspaceStorageKey(orgId, auditId),
      JSON.stringify({
        selectedModule: 123,
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        inputPrompt: 'Prompt',
        modelOutput: 'Output',
        hasCalledModel: true,
        status: 'INVALID',
        issueRows: [{ id: 'row-1', issueType: 'GENDER_BIAS' }],
      })
    );

    const draft = readManualEvalWorkspaceDraft(orgId, auditId);
    expect(draft?.selectedModule).toBeNull();
    expect(draft?.status).toBeNull();
    expect(draft?.issueRows).toEqual([]);
  });

  it('clears stored draft', () => {
    writeManualEvalWorkspaceDraft(orgId, auditId, makeWorkspaceDraft());
    clearManualEvalWorkspaceDraft(orgId, auditId);
    expect(readManualEvalWorkspaceDraft(orgId, auditId)).toBeNull();
  });
});

describe('module helpers', () => {
  it('exposes fallback modules and sub-modules', () => {
    const modules = getFallbackEvaluationModules();
    expect(modules.map((module) => module.name)).toContain('BIAS_FAIRNESS');
    expect(getFallbackSubModules('BIAS_FAIRNESS').length).toBeGreaterThan(0);
  });

  it('maps metric options to sub-modules', () => {
    expect(
      metricsToSubModules([
        { value: 'GENDER_BIAS', label: 'Gender Bias' },
        { value: '', label: 'Ignored' },
      ])
    ).toEqual([{ name: 'GENDER_BIAS', displayName: 'Gender Bias' }]);
  });

  it('sums manual test case counts from module progress', () => {
    expect(
      getTotalManualTestCaseCount([
        makeModuleProgress({ testCaseCount: 2 }),
        makeModuleProgress({ testCaseCount: 3 }),
      ])
    ).toBe(5);
  });
});

describe('resolveIssueDisplayName', () => {
  const subModules = [{ name: 'GENDER_BIAS', displayName: 'Gender Bias' }];

  it('prefers API display names', () => {
    expect(resolveIssueDisplayName('GENDER_BIAS', subModules)).toBe('Gender Bias');
  });

  it('falls back to module-specific static labels', () => {
    expect(resolveIssueDisplayName('CASTE_BIAS', [], 'BIAS_FAIRNESS')).toBe('Caste Bias');
  });

  it('humanizes unknown keys', () => {
    expect(resolveIssueDisplayName('CUSTOM_ISSUE', [])).toBe('Custom Issue');
  });
});

describe('MIN_PLAYGROUND_TEST_CASES', () => {
  it('requires at least three test cases to finish', () => {
    expect(MIN_PLAYGROUND_TEST_CASES).toBe(3);
  });
});
