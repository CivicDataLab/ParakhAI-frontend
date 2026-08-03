import { beforeEach, describe, expect, it, vi } from 'vitest';
import EvaluationDetail from '@/features/dashboard/components/EvaluationDetail/EvaluationDetail';
import { makeBulkAudit } from '@/testing/fixtures/bulk-evaluation';
import { makePlaygroundAudit } from '@/testing/fixtures/playground-evaluation';
import { render, screen } from '@/testing/utils';

const mockUseEvaluationDetail = vi.fn();

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/app/[locale]/dashboard/ai-maker/[orgId]/OrganizationContext', () => ({
  useOrganization: () => ({ organization: { name: 'Test Org' } }),
}));

vi.mock('@/features/dashboard/components/EvaluationDetail/hooks/use-evaluation-detail', () => ({
  useEvaluationDetail: (...args: unknown[]) => mockUseEvaluationDetail(...args),
}));

vi.mock('@/features/dashboard/components/EvaluationDetail/EvaluationHeader', () => ({
  default: () => <div data-testid="evaluation-header" />,
}));

vi.mock(
  '@/app/[locale]/dashboard/ai-maker/[orgId]/evaluations/components/EvaluationFormOverview',
  () => ({
    default: () => <div data-testid="evaluation-form-overview" />,
  })
);

vi.mock(
  '@/app/[locale]/dashboard/ai-maker/[orgId]/evaluations/components/manual-evaluation',
  () => ({
    default: () => <div data-testid="manual-evaluation-flow" />,
  })
);

vi.mock('@/features/dashboard/components/EvaluationFailedBanner', () => ({
  default: () => <div data-testid="evaluation-failed-banner" />,
}));

vi.mock('@/features/dashboard/components/EvaluationProgressSection', () => ({
  default: ({ progressPercent }: { progressPercent: number }) => (
    <div data-testid="evaluation-progress">{progressPercent}</div>
  ),
}));

vi.mock('@/features/dashboard/components/EvaluationSummaryCard', () => ({
  default: () => <div data-testid="evaluation-summary-card" />,
}));

vi.mock('@/features/dashboard/components/AuditResultsList', () => ({
  default: () => <div data-testid="audit-results-list" />,
}));

vi.mock('@/features/dashboard/components/EvaluationDetail/EvaluationActions', () => ({
  default: () => <div data-testid="evaluation-actions" />,
}));

vi.mock('@/features/dashboard/components/SkippedTestsErrorsCard', () => ({
  default: ({ errorMessage }: { errorMessage: string }) => (
    <div data-testid="skipped-tests-errors">{errorMessage}</div>
  ),
}));

vi.mock(
  '@/app/[locale]/dashboard/ai-maker/[orgId]/evaluations/components/manual-evaluation/RecommendationModal',
  () => ({
    default: ({ open }: { open: boolean }) =>
      open ? <div data-testid="recommendation-modal" /> : null,
  })
);

function makeHookState(overrides: Record<string, unknown> = {}) {
  const audit = makeBulkAudit({
    status: 'COMPLETED',
    completedAt: '2026-01-02T00:00:00Z',
    totalTests: 10,
    passedTests: 8,
    failedTests: 2,
    skippedTests: 1,
    errorMessage: 'Skipped due to timeout',
    ...((overrides.audit as object) || {}),
  });

  return {
    audit,
    auditResults: [],
    metricSummary: {},
    evaluatorRecommendation: 'All good',
    modelVersion: '1.0',
    editableName: audit.name,
    isLoading: false,
    error: null,
    isSavingEvaluation: false,
    isGeneratingReport: false,
    isDownloading: false,
    showSubmitRecommendationModal: false,
    setEditableName: vi.fn(),
    setShowSubmitRecommendationModal: vi.fn(),
    saveEvaluationName: vi.fn(),
    submitBulkReview: vi.fn(),
    handlePrimaryActionClick: vi.fn(),
    computed: {
      isPlaygroundEvaluation: false,
      isBulkPendingReview: false,
      showDownloadActions: true,
      isReportReady: true,
      isRunning: false,
      isPlaygroundInProgress: false,
      riskSummary: { low: 1, medium: 1, high: 1 },
      progressPercent: 75,
      auditModelType: 'TEXT_GENERATION',
      evaluationScopeDisplay: 'Full Model',
      passRate: 80,
      passRateColor: 'warning',
    },
    ...overrides,
  };
}

describe('EvaluationDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEvaluationDetail.mockReturnValue(makeHookState());
  });

  it('shows loading state', () => {
    mockUseEvaluationDetail.mockReturnValue(makeHookState({ isLoading: true, audit: null }));

    render(<EvaluationDetail evaluationId="eval-1" orgId="org-1" backLink="/back" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(screen.getByText('Loading evaluation...')).toBeInTheDocument();
  });

  it('shows error state with back link', () => {
    mockUseEvaluationDetail.mockReturnValue(
      makeHookState({ error: 'Failed to load', audit: null })
    );

    render(<EvaluationDetail evaluationId="eval-1" orgId="org-1" backLink="/back" />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Evaluations' })).toHaveAttribute(
      'href',
      '/back'
    );
  });

  it('renders completed bulk evaluation sections', () => {
    render(<EvaluationDetail evaluationId="eval-1" orgId="org-1" backLink="/back" />);

    expect(screen.getByTestId('evaluation-header')).toBeInTheDocument();
    expect(screen.getByTestId('evaluation-form-overview')).toBeInTheDocument();
    expect(screen.getByText("Evaluator's Recommendations")).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.getByTestId('evaluation-summary-card')).toBeInTheDocument();
    expect(screen.getByTestId('audit-results-list')).toBeInTheDocument();
    expect(screen.getByTestId('evaluation-actions')).toBeInTheDocument();
    expect(screen.getByTestId('skipped-tests-errors')).toHaveTextContent('Skipped due to timeout');
  });

  it('renders failed evaluation banner for failed audits', () => {
    mockUseEvaluationDetail.mockReturnValue(
      makeHookState({
        audit: makeBulkAudit({ status: 'FAILED', completedAt: null }),
        computed: {
          ...makeHookState().computed,
          isRunning: false,
          showDownloadActions: false,
        },
      })
    );

    render(<EvaluationDetail evaluationId="eval-1" orgId="org-1" backLink="/back" />);

    expect(screen.getByTestId('evaluation-failed-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('evaluation-actions')).not.toBeInTheDocument();
  });

  it('renders progress section while evaluation is running', () => {
    mockUseEvaluationDetail.mockReturnValue(
      makeHookState({
        audit: makeBulkAudit({ status: 'IN_PROGRESS', completedAt: null }),
        computed: {
          ...makeHookState().computed,
          isRunning: true,
          showDownloadActions: false,
        },
      })
    );

    render(<EvaluationDetail evaluationId="eval-1" orgId="org-1" backLink="/back" />);

    expect(screen.getByTestId('evaluation-progress')).toHaveTextContent('75');
  });

  it('renders playground manual flow while in progress', () => {
    mockUseEvaluationDetail.mockReturnValue(
      makeHookState({
        audit: makePlaygroundAudit({ status: 'IN_PROGRESS' }),
        computed: {
          ...makeHookState().computed,
          isPlaygroundEvaluation: true,
          isPlaygroundInProgress: true,
          isRunning: true,
          showDownloadActions: false,
        },
      })
    );

    render(<EvaluationDetail evaluationId="eval-1" orgId="org-1" backLink="/back" />);

    expect(screen.getByTestId('manual-evaluation-flow')).toBeInTheDocument();
  });

  it('shows recommendation modal when open', () => {
    mockUseEvaluationDetail.mockReturnValue(makeHookState({ showSubmitRecommendationModal: true }));

    render(<EvaluationDetail evaluationId="eval-1" orgId="org-1" backLink="/back" />);

    expect(screen.getByTestId('recommendation-modal')).toBeInTheDocument();
  });
});
