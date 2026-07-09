import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeAuditResult,
  makeGroupedAuditResults,
  resetFixtureCounter,
} from '@/testing/fixtures/bulk-evaluation';
import { render, screen } from '@/testing/utils';
import AuditResultsList from './AuditResultsList';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('./BulkTestCaseDetailSheet', () => ({
  default: ({ open, testCase }: { open: boolean; testCase: { index: number } | null }) =>
    open && testCase ? (
      <div data-testid="detail-sheet">Detail for Input {testCase.index}</div>
    ) : null,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock('@tabler/icons-react', () => ({
  IconArrowsDiagonal: () => <span data-testid="icon-diagonal" />,
  IconSparkles: () => <span data-testid="icon-sparkles" />,
}));

describe('AuditResultsList', () => {
  const metricSummary = {};

  beforeEach(() => {
    resetFixtureCounter();
    vi.clearAllMocks();
  });

  it('shows loading spinner when results are null', () => {
    render(<AuditResultsList auditId="audit-1" results={null} metricSummary={metricSummary} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('renders test case cards from audit results', () => {
    const results = makeGroupedAuditResults('test-1');

    render(<AuditResultsList auditId="audit-1" results={results} metricSummary={metricSummary} />);

    expect(screen.getByText('Input 1')).toBeInTheDocument();
    expect(screen.getByText('Line one')).toBeInTheDocument();
    expect(screen.getByText('Output text')).toBeInTheDocument();
    expect(screen.getByText(/High risk - Gender Bias/)).toBeInTheDocument();
  });

  it('sorts by issue count high to low by default', () => {
    resetFixtureCounter();
    const lowIssues = makeAuditResult({
      testId: 'test-low',
      riskLevel: 'LOW',
      reason: 'Minor issue',
      task: {
        id: 'task-low',
        module: 'BIAS_FAIRNESS',
        metric: 'metric_a',
        test: { id: 'test-low', testInput: 'Low issues input', actualOutput: 'Out' },
      },
    });
    const highIssues = makeGroupedAuditResults('test-high');

    render(
      <AuditResultsList
        auditId="audit-1"
        results={[lowIssues, ...highIssues]}
        metricSummary={metricSummary}
      />
    );

    const cards = screen.getAllByRole('button', { name: /View details for input/ });
    expect(cards[0]).toHaveAccessibleName('View details for input 2');
    expect(cards[1]).toHaveAccessibleName('View details for input 1');
  });

  it('sorts by issue count low to high when selected', async () => {
    const user = userEvent.setup();
    resetFixtureCounter();
    const lowIssues = makeAuditResult({
      testId: 'test-low',
      riskLevel: 'LOW',
      reason: 'Minor issue',
      task: {
        id: 'task-low',
        module: 'BIAS_FAIRNESS',
        metric: 'metric_a',
        test: { id: 'test-low', testInput: 'Low issues input', actualOutput: 'Out' },
      },
    });
    const highIssues = makeGroupedAuditResults('test-high');

    render(
      <AuditResultsList
        auditId="audit-1"
        results={[lowIssues, ...highIssues]}
        metricSummary={metricSummary}
      />
    );

    await user.selectOptions(screen.getByLabelText('Sort'), 'issues_asc');

    const cards = screen.getAllByRole('button', { name: /View details for input/ });
    expect(cards[0]).toHaveAccessibleName('View details for input 1');
    expect(cards[1]).toHaveAccessibleName('View details for input 2');
  });

  it('opens detail sheet when a card is clicked', async () => {
    const user = userEvent.setup();
    const results = makeGroupedAuditResults('test-open');

    render(<AuditResultsList auditId="audit-1" results={results} metricSummary={metricSummary} />);

    const card = screen.getByRole('button', { name: 'View details for input 1' });
    await user.click(card);

    expect(screen.getByTestId('detail-sheet')).toHaveTextContent('Detail for Input 1');
  });

  it('shows empty state when no inputs match', () => {
    render(<AuditResultsList auditId="audit-1" results={[]} metricSummary={metricSummary} />);

    expect(screen.getByText('No inputs found for the selected module.')).toBeInTheDocument();
  });

  it('shows module issue pills', () => {
    const results = makeGroupedAuditResults('test-pills');

    render(<AuditResultsList auditId="audit-1" results={results} metricSummary={metricSummary} />);

    const pills = screen.getByText(/Bias and Fairness - 2 Issues/);
    expect(pills).toBeInTheDocument();
  });
});
