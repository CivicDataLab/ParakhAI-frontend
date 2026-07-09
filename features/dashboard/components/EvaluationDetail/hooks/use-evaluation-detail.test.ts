import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makePlaygroundAudit } from '@/testing/fixtures/playground-evaluation';
import { useAuditActions } from './use-audit-actions';
import { useAuditData } from './use-audit-data';
import { useEvaluationDetail } from './use-evaluation-detail';

const mockStopProgressPolling = vi.fn();
const mockSubmitBulkReview = vi.fn();

vi.mock('./use-audit-data', () => ({
  useAuditData: vi.fn(),
}));

vi.mock('./use-audit-polling', () => ({
  useAuditPolling: vi.fn(() => ({ stopProgressPolling: mockStopProgressPolling })),
}));

vi.mock('./use-audit-actions', () => ({
  useAuditActions: vi.fn(),
}));

const mockedUseAuditData = vi.mocked(useAuditData);
const mockedUseAuditActions = vi.mocked(useAuditActions);

function setupAuditData(
  overrides: {
    audit?: ReturnType<typeof makePlaygroundAudit> | null;
    auditReport?: { name: string; size: number | null; url: string } | null;
  } = {}
) {
  const audit = overrides.audit === undefined ? makePlaygroundAudit() : overrides.audit;

  mockedUseAuditData.mockReturnValue({
    audit,
    auditResults: [],
    auditReport: overrides.auditReport ?? null,
    riskDistribution: { LOW_RISK: 0, MEDIUM_RISK: 0, HIGH_RISK: 0 },
    metricSummary: {},
    evaluatorRecommendation: '',
    evaluationProgress: 25,
    isLoading: false,
    isSessionLoading: false,
    isAuthenticated: true,
    error: null,
    setAudit: vi.fn(),
    setEvaluatorRecommendation: vi.fn(),
    setEvaluationProgress: vi.fn(),
    fetchAuditSummary: vi.fn().mockResolvedValue({ hasReport: false }),
    fetchAuditResults: vi.fn().mockResolvedValue(undefined),
  } as ReturnType<typeof useAuditData>);
}

function setupAuditActions() {
  mockedUseAuditActions.mockReturnValue({
    isSavingName: false,
    isSavingEvaluation: false,
    isGeneratingReport: false,
    isDownloading: false,
    showSubmitRecommendationModal: false,
    setShowSubmitRecommendationModal: vi.fn(),
    saveEvaluationName: vi.fn(),
    submitBulkReview: mockSubmitBulkReview,
    generateReport: vi.fn(),
    downloadReport: vi.fn(),
  });
}

describe('useEvaluationDetail playground computed flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuditActions();
  });

  it('identifies playground evaluations', () => {
    setupAuditData({ audit: makePlaygroundAudit({ evaluationMode: 'PLAYGROUND' }) });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.computed.isPlaygroundEvaluation).toBe(true);
    expect(result.current.computed.isBulkPendingReview).toBe(false);
    expect(result.current.computed.isBulkCompleted).toBe(false);
  });

  it('marks playground in progress when status is IN_PROGRESS', () => {
    setupAuditData({
      audit: makePlaygroundAudit({ status: 'IN_PROGRESS', evaluationMode: 'manual' }),
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.computed.isPlaygroundInProgress).toBe(true);
    expect(result.current.computed.isRunning).toBe(true);
  });

  it('shows download actions only after playground completion', () => {
    setupAuditData({
      audit: makePlaygroundAudit({
        status: 'COMPLETED',
        completedAt: '2026-01-02T00:00:00Z',
      }),
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.computed.isEvaluationComplete).toBe(true);
    expect(result.current.computed.showDownloadActions).toBe(true);
  });

  it('hides download actions while playground is in progress', () => {
    setupAuditData({
      audit: makePlaygroundAudit({ status: 'IN_PROGRESS', completedAt: null }),
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.computed.showDownloadActions).toBe(false);
  });

  it('shows report-ready state when audit report exists', () => {
    setupAuditData({
      audit: makePlaygroundAudit({
        status: 'COMPLETED',
        completedAt: '2026-01-02T00:00:00Z',
      }),
      auditReport: { name: 'report.pdf', size: 100, url: 'https://example.com/report.pdf' },
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.computed.isReportReady).toBe(true);
  });
});
