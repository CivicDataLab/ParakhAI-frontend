import { describe, expect, it, vi } from 'vitest';
import ManualTestCases from '@/features/ai-maker/components/evaluations/ManualTestCases';
import { render, screen } from '@/testing/utils';

vi.mock('@/features/ai-maker/components/manual-evaluation', () => ({
  default: ({ auditId }: { auditId: string }) => (
    <div data-testid="manual-evaluation-flow">Manual flow for {auditId}</div>
  ),
}));

describe('ManualTestCases', () => {
  const baseProps = {
    modules: ['BIAS_FAIRNESS'],
    orgId: 'org-1',
    onRunAudit: vi.fn(),
    isRequestingAudit: false,
  };

  it('shows configuration prompt when auditId is missing', () => {
    render(<ManualTestCases {...baseProps} />);

    expect(
      screen.getByText(
        'Please complete the configuration and create the audit to begin manual evaluation.'
      )
    ).toBeInTheDocument();
  });

  it('renders manual evaluation flow when auditId is provided', () => {
    render(<ManualTestCases {...baseProps} auditId="audit-42" />);

    expect(screen.getByTestId('manual-evaluation-flow')).toHaveTextContent(
      'Manual flow for audit-42'
    );
  });
});
