import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditActions } from '@/features/dashboard/components/EvaluationDetail/hooks/use-audit-actions';
import { useAuditData } from '@/features/dashboard/components/EvaluationDetail/hooks/use-audit-data';
import { useEvaluationDetail } from '@/features/dashboard/components/EvaluationDetail/hooks/use-evaluation-detail';
import { makeBulkAudit } from '@/testing/fixtures/bulk-evaluation';
import { makePlaygroundAudit } from '@/testing/fixtures/playground-evaluation';

const mockStopProgressPolling = vi.fn();
const mockSubmitBulkReview = vi.fn();

vi.mock('@/features/dashboard/components/EvaluationDetail/hooks/use-audit-data', () => ({
  useAuditData: vi.fn(),
}));

vi.mock('@/features/dashboard/components/EvaluationDetail/hooks/use-audit-polling', () => ({
  useAuditPolling: vi.fn(() => ({ stopProgressPolling: mockStopProgressPolling })),
}));

vi.mock('@/features/dashboard/components/EvaluationDetail/hooks/use-audit-actions', () => ({
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
    setRiskDistribution: vi.fn(),
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

describe('useEvaluationDetail bulk and pass-rate computed values', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuditActions();
  });

  it('identifies bulk pending review and completed states', () => {
    setupAuditData({
      audit: makeBulkAudit({ status: 'PENDING_REVIEW', evaluationMode: 'BULK' }),
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.computed.isBulkPendingReview).toBe(true);
    expect(result.current.computed.isBulkCompleted).toBe(false);
    expect(result.current.computed.showDownloadActions).toBe(false);
  });

  it('shows bulk download actions when evaluation is completed', () => {
    setupAuditData({
      audit: makeBulkAudit({
        status: 'COMPLETED',
        completedAt: '2026-01-02T00:00:00Z',
      }),
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.computed.isBulkCompleted).toBe(true);
    expect(result.current.computed.showDownloadActions).toBe(true);
  });

  it('derives pass rate and success color for high pass rates', () => {
    setupAuditData({
      audit: makeBulkAudit({ totalTests: 100, passedTests: 90 }),
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.computed.passRate).toBe('90.00');
    expect(result.current.computed.passRateColor).toBe('success');
  });

  it('derives warning color for moderate pass rates', () => {
    setupAuditData({
      audit: makeBulkAudit({ totalTests: 100, passedTests: 75 }),
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.computed.passRate).toBe('75.00');
    expect(result.current.computed.passRateColor).toBe('warning');
  });

  it('returns undefined pass rate color for low pass rates', () => {
    setupAuditData({
      audit: makeBulkAudit({ totalTests: 100, passedTests: 50 }),
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.computed.passRate).toBe('50.00');
    expect(result.current.computed.passRateColor).toBeUndefined();
  });

  it('returns zero pass rate when tests are missing', () => {
    setupAuditData({
      audit: makeBulkAudit({ totalTests: 0, passedTests: 0 }),
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.computed.passRate).toBe(0);
    expect(result.current.computed.passRateColor).toBeUndefined();
  });

  it('formats evaluation scope from arrays and snake_case strings', () => {
    setupAuditData({
      audit: makeBulkAudit({
        // Array scope lives on configuration; Audit.auditScope is string | null
        configuration: { auditScope: ['BIAS_FAIRNESS', 'PRIVACY_SAFETY'] },
      }),
    });

    const { result: arrayResult } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));
    expect(arrayResult.current.computed.evaluationScopeDisplay).toBe(
      'Bias Fairness, Privacy Safety'
    );

    setupAuditData({
      audit: makeBulkAudit({ auditScope: 'MODEL_BEHAVIOR' }),
    });

    const { result: stringResult } = renderHook(() => useEvaluationDetail('eval-2', 'org-1'));
    expect(stringResult.current.computed.evaluationScopeDisplay).toBe('Model Behavior');
  });

  it('syncs model version from snapshot single version and versions list', () => {
    setupAuditData({
      audit: makeBulkAudit({
        modelVersionId: 7,
        modelSnapshot: { version: { id: 7, version: 'v1.2.3' } },
      }),
    });

    const { result: singleVersionResult } = renderHook(() =>
      useEvaluationDetail('eval-1', 'org-1')
    );
    expect(singleVersionResult.current.modelVersion).toBe('v1.2.3');

    setupAuditData({
      audit: makeBulkAudit({
        modelVersionId: 9,
        modelSnapshot: {
          versions: [
            { id: 8, version: 'v1.0.0' },
            { id: 9, version: 'v2.0.0' },
          ],
        },
      }),
    });

    const { result: versionsListResult } = renderHook(() => useEvaluationDetail('eval-2', 'org-1'));
    expect(versionsListResult.current.modelVersion).toBe('v2.0.0');
  });

  it('uses audit id fallback when name is missing and syncs saved recommendation', () => {
    const setEvaluatorRecommendation = vi.fn();

    mockedUseAuditData.mockReturnValue({
      audit: makeBulkAudit({ name: '', id: 'abcdefgh-1234' }),
      auditResults: [],
      auditReport: null,
      riskDistribution: { LOW_RISK: 0, MEDIUM_RISK: 0, HIGH_RISK: 0 },
      metricSummary: {},
      evaluatorRecommendation: '',
      evaluationProgress: 0,
      isLoading: false,
      isSessionLoading: false,
      isAuthenticated: true,
      error: null,
      setAudit: vi.fn(),
      setRiskDistribution: vi.fn(),
      setEvaluatorRecommendation,
      setEvaluationProgress: vi.fn(),
      fetchAuditSummary: vi.fn().mockResolvedValue({ hasReport: false }),
      fetchAuditResults: vi.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof useAuditData>);

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    expect(result.current.editableName).toBe('Evaluation #abcdefgh');
    expect(setEvaluatorRecommendation).not.toHaveBeenCalled();
    expect(result.current.isEvaluationSaved).toBe(false);
  });
});

describe('useEvaluationDetail primary actions', () => {
  const mockGenerateReport = vi.fn();
  const mockDownloadReport = vi.fn();
  const mockSetShowSubmitRecommendationModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuditActions.mockReturnValue({
      isSavingName: false,
      isSavingEvaluation: false,
      isGeneratingReport: false,
      isDownloading: false,
      showSubmitRecommendationModal: false,
      setShowSubmitRecommendationModal: mockSetShowSubmitRecommendationModal,
      saveEvaluationName: vi.fn(),
      submitBulkReview: mockSubmitBulkReview,
      generateReport: mockGenerateReport,
      downloadReport: mockDownloadReport,
    });
  });

  it('downloads report when download actions are available and report exists', () => {
    setupAuditData({
      audit: makePlaygroundAudit({
        status: 'COMPLETED',
        completedAt: '2026-01-02T00:00:00Z',
      }),
      auditReport: { name: 'report.pdf', size: 100, url: 'https://example.com/report.pdf' },
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    act(() => {
      result.current.handlePrimaryActionClick();
    });

    expect(mockDownloadReport).toHaveBeenCalled();
    expect(mockGenerateReport).not.toHaveBeenCalled();
    expect(mockSetShowSubmitRecommendationModal).not.toHaveBeenCalled();
  });

  it('generates report when download actions are available but report is missing', () => {
    setupAuditData({
      audit: makePlaygroundAudit({
        status: 'COMPLETED',
        completedAt: '2026-01-02T00:00:00Z',
      }),
      auditReport: null,
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    act(() => {
      result.current.handlePrimaryActionClick();
    });

    expect(mockGenerateReport).toHaveBeenCalled();
    expect(mockDownloadReport).not.toHaveBeenCalled();
  });

  it('opens submit recommendation modal when download actions are unavailable', () => {
    setupAuditData({
      audit: makeBulkAudit({ status: 'PENDING_REVIEW' }),
    });

    const { result } = renderHook(() => useEvaluationDetail('eval-1', 'org-1'));

    act(() => {
      result.current.handlePrimaryActionClick();
    });

    expect(mockSetShowSubmitRecommendationModal).toHaveBeenCalledWith(true);
    expect(mockGenerateReport).not.toHaveBeenCalled();
    expect(mockDownloadReport).not.toHaveBeenCalled();
  });

  it('resets saved state when evaluation id changes', () => {
    setupAuditData({
      audit: makeBulkAudit({
        configuration: { evaluatorRecommendation: 'Ship with fixes' },
      }),
    });

    const { result, rerender } = renderHook(
      ({ evaluationId }) => useEvaluationDetail(evaluationId, 'org-1'),
      { initialProps: { evaluationId: 'eval-1' } }
    );

    expect(result.current.isEvaluationSaved).toBe(true);

    setupAuditData({
      audit: makeBulkAudit({ configuration: {} }),
    });
    rerender({ evaluationId: 'eval-2' });

    expect(result.current.isEvaluationSaved).toBe(false);
  });
});
