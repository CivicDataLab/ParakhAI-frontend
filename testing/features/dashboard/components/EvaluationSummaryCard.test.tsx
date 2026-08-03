import { describe, expect, it, vi } from 'vitest';
import EvaluationSummaryCard from '@/features/dashboard/components/EvaluationSummaryCard';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

describe('EvaluationSummaryCard', () => {
  const defaultProps = {
    totalTests: 10,
    passedTests: 8,
    failedTests: 1,
    skippedTests: 1,
    riskSummary: { low: 2, medium: 1, high: 0 },
    passRate: 80,
    passRateColor: 'warning' as const,
  };

  it('renders evaluation summary stats and risk breakdown', () => {
    render(<EvaluationSummaryCard {...defaultProps} />);

    expect(screen.getByText('Evaluation Summary')).toBeInTheDocument();
    expect(screen.getByText('TOTAL PASS RATE')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('TOTAL TEST CASES')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('PASSED TESTS')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('FAILED TESTS')).toBeInTheDocument();
    expect(screen.getByText('SKIPPED TESTS')).toBeInTheDocument();
    expect(screen.getByText('Total Issues Identified:')).toBeInTheDocument();
    expect(screen.getByText('3 Issues')).toBeInTheDocument();
    expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM RISK')).toBeInTheDocument();
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
  });

  it('uses singular issue label when only one issue exists', () => {
    render(
      <EvaluationSummaryCard {...defaultProps} riskSummary={{ low: 1, medium: 0, high: 0 }} />
    );

    expect(screen.getByText('1 Issue')).toBeInTheDocument();
  });

  it('falls back to zero for missing numeric values', () => {
    render(
      <EvaluationSummaryCard
        totalTests={0}
        passedTests={0}
        failedTests={0}
        skippedTests={0}
        riskSummary={{ low: 0, medium: 0, high: 0 }}
        passRate={0}
      />
    );

    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByText('0 Issues')).toBeInTheDocument();
  });
});
