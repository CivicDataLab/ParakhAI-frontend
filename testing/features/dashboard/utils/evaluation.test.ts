import { describe, expect, it } from 'vitest';
import {
  aggregateRiskFromAuditResults,
  aggregateRiskFromMetricSummary,
  buildRiskDistribution,
  canShowBulkSummaryAndResults,
  canShowEvaluationResults,
  formatAuditErrorDetails,
  formatModuleName,
  getEvaluatorLabel,
  getModeLabel,
  getRiskDistributionTotal,
  getSeverityTagColors,
  hasCompletedAuditResults,
  isAuditFailed,
  isAuditInProgress,
  isAuditPendingReview,
  isPlaygroundEvaluationMode,
  isProgressComplete,
  parseEvaluatorRecommendation,
  readRiskCount,
  resolveRiskDistribution,
  shouldStopPolling,
} from '@/features/dashboard/utils/evaluation';
import {
  makeAuditResult,
  makePassingResult,
  makeReviewedResult,
} from '@/testing/fixtures/bulk-evaluation/audit-results';

describe('isPlaygroundEvaluationMode', () => {
  it('returns true for manual and playground modes', () => {
    expect(isPlaygroundEvaluationMode('manual')).toBe(true);
    expect(isPlaygroundEvaluationMode('playground')).toBe(true);
    expect(isPlaygroundEvaluationMode('PLAYGROUND')).toBe(true);
  });

  it('returns false for bulk modes', () => {
    expect(isPlaygroundEvaluationMode('bulk')).toBe(false);
    expect(isPlaygroundEvaluationMode('BULK')).toBe(false);
    expect(isPlaygroundEvaluationMode('automated')).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(isPlaygroundEvaluationMode(null)).toBe(false);
    expect(isPlaygroundEvaluationMode(undefined)).toBe(false);
  });
});

describe('canShowEvaluationResults for playground', () => {
  it('does not show results while in progress', () => {
    expect(canShowEvaluationResults({ status: 'IN_PROGRESS', completedAt: null }, true)).toBe(
      false
    );
    expect(canShowEvaluationResults({ status: 'PENDING_REVIEW', completedAt: null }, true)).toBe(
      false
    );
  });

  it('shows results when completed', () => {
    expect(canShowEvaluationResults({ status: 'COMPLETED', completedAt: '2026-01-02' }, true)).toBe(
      true
    );
    expect(
      canShowEvaluationResults({ status: 'IN_PROGRESS', completedAt: '2026-01-02' }, true)
    ).toBe(true);
  });
});

describe('shouldStopPolling for playground', () => {
  it('does not stop at PENDING_REVIEW', () => {
    expect(shouldStopPolling({ status: 'PENDING_REVIEW', completedAt: null }, true)).toBe(false);
  });

  it('stops when completed', () => {
    expect(shouldStopPolling({ status: 'COMPLETED', completedAt: '2026-01-02' }, true)).toBe(true);
  });

  it('continues while in progress', () => {
    expect(shouldStopPolling({ status: 'IN_PROGRESS', completedAt: null }, true)).toBe(false);
  });
});

describe('getModeLabel for playground', () => {
  it('returns Playground Evaluation for manual and playground modes', () => {
    expect(getModeLabel('manual')).toBe('Playground Evaluation');
    expect(getModeLabel('playground')).toBe('Playground Evaluation');
  });
});

describe('isAuditInProgress', () => {
  it('returns true for in-progress statuses', () => {
    expect(isAuditInProgress('IN_PROGRESS')).toBe(true);
    expect(isAuditInProgress('queued')).toBe(true);
    expect(isAuditInProgress('PENDING')).toBe(true);
  });

  it('returns false for other statuses', () => {
    expect(isAuditInProgress('COMPLETED')).toBe(false);
    expect(isAuditInProgress('PENDING_REVIEW')).toBe(false);
    expect(isAuditInProgress(null)).toBe(false);
    expect(isAuditInProgress(undefined)).toBe(false);
  });
});

describe('isAuditPendingReview', () => {
  it('returns true only for PENDING_REVIEW', () => {
    expect(isAuditPendingReview('PENDING_REVIEW')).toBe(true);
    expect(isAuditPendingReview('pending_review')).toBe(true);
  });

  it('returns false for other statuses', () => {
    expect(isAuditPendingReview('IN_PROGRESS')).toBe(false);
    expect(isAuditPendingReview(null)).toBe(false);
  });
});

describe('isAuditFailed', () => {
  it('returns true for failed statuses', () => {
    expect(isAuditFailed('FAILED')).toBe(true);
    expect(isAuditFailed('error')).toBe(true);
  });

  it('returns false for other statuses', () => {
    expect(isAuditFailed('COMPLETED')).toBe(false);
    expect(isAuditFailed(null)).toBe(false);
  });
});

describe('hasCompletedAuditResults', () => {
  it('returns true when status is COMPLETED or completedAt is set', () => {
    expect(hasCompletedAuditResults({ status: 'COMPLETED', completedAt: null })).toBe(true);
    expect(hasCompletedAuditResults({ status: 'IN_PROGRESS', completedAt: '2026-01-02' })).toBe(
      true
    );
  });

  it('returns false when not completed', () => {
    expect(hasCompletedAuditResults({ status: 'IN_PROGRESS', completedAt: null })).toBe(false);
  });
});

describe('canShowBulkSummaryAndResults', () => {
  it('returns true when completed or pending review', () => {
    expect(canShowBulkSummaryAndResults({ status: 'COMPLETED', completedAt: null })).toBe(true);
    expect(canShowBulkSummaryAndResults({ status: 'PENDING_REVIEW', completedAt: null })).toBe(
      true
    );
  });

  it('returns false while in progress', () => {
    expect(canShowBulkSummaryAndResults({ status: 'IN_PROGRESS', completedAt: null })).toBe(false);
  });
});

describe('canShowEvaluationResults for bulk', () => {
  it('shows results when completed or pending review', () => {
    expect(canShowEvaluationResults({ status: 'COMPLETED', completedAt: null }, false)).toBe(true);
    expect(canShowEvaluationResults({ status: 'PENDING_REVIEW', completedAt: null }, false)).toBe(
      true
    );
  });

  it('does not show results while in progress', () => {
    expect(canShowEvaluationResults({ status: 'IN_PROGRESS', completedAt: null }, false)).toBe(
      false
    );
  });

  it('does not show results when failed', () => {
    expect(canShowEvaluationResults({ status: 'FAILED', completedAt: null }, false)).toBe(false);
    expect(
      canShowEvaluationResults({ status: 'COMPLETED', completedAt: '2026-01-02' }, false)
    ).toBe(true);
  });
});

describe('shouldStopPolling for bulk', () => {
  it('stops at PENDING_REVIEW', () => {
    expect(shouldStopPolling({ status: 'PENDING_REVIEW', completedAt: null }, false)).toBe(true);
  });

  it('stops when completed', () => {
    expect(shouldStopPolling({ status: 'COMPLETED', completedAt: '2026-01-02' }, false)).toBe(true);
  });

  it('continues while in progress', () => {
    expect(shouldStopPolling({ status: 'IN_PROGRESS', completedAt: null }, false)).toBe(false);
  });
});

describe('isProgressComplete', () => {
  it('returns true when progress is 100 or more', () => {
    expect(isProgressComplete(100)).toBe(true);
    expect(isProgressComplete(150)).toBe(true);
  });

  it('returns false for incomplete or invalid progress', () => {
    expect(isProgressComplete(99)).toBe(false);
    expect(isProgressComplete(null)).toBe(false);
    expect(isProgressComplete(undefined)).toBe(false);
  });
});

describe('formatModuleName', () => {
  it('maps known module keys to display names', () => {
    expect(formatModuleName('BIAS_FAIRNESS')).toBe('Bias and Fairness');
    expect(formatModuleName('HALLUCINATION_MISINFORMATION')).toBe(
      'Hallucination and MisInformation'
    );
    expect(formatModuleName('PRIVACY_SAFETY')).toBe('Privacy and Safety');
  });

  it('humanizes unknown module keys', () => {
    expect(formatModuleName('CUSTOM_MODULE_NAME')).toBe('Custom Module Name');
  });
});

describe('getEvaluatorLabel', () => {
  it('returns expert labels for known audit types', () => {
    expect(getEvaluatorLabel('DOMAIN_EXPERT')).toBe('Domain Expert');
    expect(getEvaluatorLabel('cultural-expert')).toBe('Cultural Expert');
    expect(getEvaluatorLabel('TECHNICAL')).toBe('Technical Evaluator');
  });

  it('returns audit type or fallback for unknown types', () => {
    expect(getEvaluatorLabel('Custom Type')).toBe('Custom Type');
    expect(getEvaluatorLabel(null)).toBe('--');
  });
});

describe('getModeLabel for bulk and fallback', () => {
  it('returns Bulk Evaluation for bulk and automated modes', () => {
    expect(getModeLabel('bulk')).toBe('Bulk Evaluation');
    expect(getModeLabel('automated')).toBe('Bulk Evaluation');
    expect(getModeLabel('BULK')).toBe('Bulk Evaluation');
  });

  it('returns mode or fallback for unknown modes', () => {
    expect(getModeLabel('custom')).toBe('custom');
    expect(getModeLabel(null)).toBe('--');
  });
});

describe('formatAuditErrorDetails', () => {
  it('returns trimmed string errorDetails', () => {
    expect(
      formatAuditErrorDetails({ errorDetails: '  Something went wrong  ', errorMessage: null })
    ).toBe('Something went wrong');
  });

  it('extracts known keys from object errorDetails', () => {
    expect(
      formatAuditErrorDetails({
        errorDetails: { detail: 'Validation failed' },
        errorMessage: null,
      })
    ).toBe('Validation failed');
    expect(
      formatAuditErrorDetails({
        errorDetails: { message: 'Timeout' },
        errorMessage: 'fallback',
      })
    ).toBe('Timeout');
  });

  it('serializes object errorDetails when no known keys match', () => {
    const details = { code: 500, info: 'server error' };
    expect(formatAuditErrorDetails({ errorDetails: details, errorMessage: null })).toBe(
      JSON.stringify(details, null, 2)
    );
  });

  it('falls back to errorMessage', () => {
    expect(
      formatAuditErrorDetails({ errorDetails: null, errorMessage: '  Generic failure  ' })
    ).toBe('Generic failure');
  });

  it('returns empty string when no details available', () => {
    expect(formatAuditErrorDetails({ errorDetails: null, errorMessage: null })).toBe('');
    expect(formatAuditErrorDetails({ errorDetails: {}, errorMessage: null })).toBe('');
  });
});

describe('aggregateRiskFromMetricSummary', () => {
  it('sums risk counts across metric summary entries', () => {
    const summary = {
      metric_a: { risk_distribution: { LOW_RISK: 1, MEDIUM_RISK: 2, HIGH_RISK: 3 } },
      metric_b: { risk_distribution: { low: 4, medium: 5, high: 6 } },
    };

    expect(aggregateRiskFromMetricSummary(summary)).toEqual({
      LOW_RISK: 5,
      MEDIUM_RISK: 7,
      HIGH_RISK: 9,
    });
  });

  it('returns zeros for null or empty summary', () => {
    expect(aggregateRiskFromMetricSummary(null)).toEqual({
      LOW_RISK: 0,
      MEDIUM_RISK: 0,
      HIGH_RISK: 0,
    });
    expect(aggregateRiskFromMetricSummary({})).toEqual({
      LOW_RISK: 0,
      MEDIUM_RISK: 0,
      HIGH_RISK: 0,
    });
  });
});

describe('aggregateRiskFromAuditResults', () => {
  it('counts issue results by severity', () => {
    const results = [
      makeAuditResult({ riskLevel: 'HIGH' }),
      makeAuditResult({ riskLevel: 'MEDIUM' }),
      makeAuditResult({ riskLevel: 'LOW' }),
      makePassingResult(),
      makeReviewedResult({ evaluatorRiskLevel: 'HIGH' }),
    ];

    expect(aggregateRiskFromAuditResults(results)).toEqual({
      LOW_RISK: 1,
      MEDIUM_RISK: 1,
      HIGH_RISK: 2,
    });
  });

  it('returns zeros when there are no issue results', () => {
    expect(aggregateRiskFromAuditResults([makePassingResult()])).toEqual({
      LOW_RISK: 0,
      MEDIUM_RISK: 0,
      HIGH_RISK: 0,
    });
  });
});

describe('readRiskCount', () => {
  it('reads counts using alternate key names', () => {
    const distribution = { LOW: 3, medium_risk: 2, HIGH_RISK: 1 };
    expect(readRiskCount(distribution, 'low')).toBe(3);
    expect(readRiskCount(distribution, 'medium')).toBe(2);
    expect(readRiskCount(distribution, 'high')).toBe(1);
  });

  it('returns 0 for null distribution', () => {
    expect(readRiskCount(null, 'low')).toBe(0);
  });
});

describe('buildRiskDistribution', () => {
  it('builds a risk distribution object', () => {
    expect(buildRiskDistribution(1, 2, 3)).toEqual({
      LOW_RISK: 1,
      MEDIUM_RISK: 2,
      HIGH_RISK: 3,
    });
  });
});

describe('resolveRiskDistribution', () => {
  it('prefers top-level distribution when total is positive', () => {
    const topLevel = { LOW_RISK: 1, MEDIUM_RISK: 0, HIGH_RISK: 0 };
    const metricSummary = {
      m1: { risk_distribution: { LOW_RISK: 10, MEDIUM_RISK: 0, HIGH_RISK: 0 } },
    };

    expect(resolveRiskDistribution(topLevel, metricSummary)).toEqual(topLevel);
  });

  it('falls back to metric summary aggregation when top-level is empty', () => {
    const metricSummary = {
      m1: { risk_distribution: { LOW_RISK: 2, MEDIUM_RISK: 1, HIGH_RISK: 0 } },
    };

    expect(resolveRiskDistribution(null, metricSummary)).toEqual({
      LOW_RISK: 2,
      MEDIUM_RISK: 1,
      HIGH_RISK: 0,
    });
  });
});

describe('getRiskDistributionTotal', () => {
  it('sums all risk levels', () => {
    expect(getRiskDistributionTotal({ LOW_RISK: 1, MEDIUM_RISK: 2, HIGH_RISK: 3 })).toBe(6);
  });
});

describe('getSeverityTagColors', () => {
  it('returns colors for known severities', () => {
    expect(getSeverityTagColors('HIGH')).toEqual({
      fillColor: '#FEF2F2',
      textColor: '#E11D48',
    });
    expect(getSeverityTagColors('medium')).toEqual({
      fillColor: '#FFFBEB',
      textColor: '#92400E',
    });
    expect(getSeverityTagColors('LOW')).toEqual({
      fillColor: '#EFF6FF',
      textColor: '#2563EB',
    });
  });

  it('returns default colors for unknown severity', () => {
    expect(getSeverityTagColors('UNKNOWN')).toEqual({
      fillColor: '#F3F4F6',
      textColor: '#374151',
    });
  });
});

describe('parseEvaluatorRecommendation', () => {
  it('returns trimmed string recommendations', () => {
    expect(parseEvaluatorRecommendation('  My recommendation  ', null)).toBe('My recommendation');
  });

  it('joins array recommendations', () => {
    expect(parseEvaluatorRecommendation(['First', { text: 'Second' }, ''], null)).toBe(
      'First\n\nSecond'
    );
  });

  it('reads recommendation from object keys', () => {
    expect(parseEvaluatorRecommendation({ recommendation: 'From object' }, null)).toBe(
      'From object'
    );
  });

  it('falls back to configuration and auditor comments', () => {
    expect(parseEvaluatorRecommendation(null, { evaluatorRecommendation: 'From config' })).toBe(
      'From config'
    );
    expect(parseEvaluatorRecommendation(null, null, '  Auditor note  ')).toBe('Auditor note');
  });

  it('returns empty string when nothing is available', () => {
    expect(parseEvaluatorRecommendation(null, null)).toBe('');
  });
});
