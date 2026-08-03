import { describe, expect, it, vi } from 'vitest';
import EvaluationFormOverview from '@/features/ai-maker/components/evaluations/EvaluationFormOverview';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: { alt: string }) => <img alt={alt} {...props} />,
}));

describe('EvaluationFormOverview', () => {
  const defaultProps = {
    modelName: 'Test Model',
    modelVersion: '1.0',
    organizationName: 'CivicDataLab',
    evalId: 'eval-123',
    createdAt: 'Jan 1, 2026',
    completedAt: 'Jan 2, 2026',
    scope: 'Public',
    mode: 'Playground',
    evaluator: 'Jane Doe',
    modules: 'Bias and Fairness',
    objective: 'Evaluate model safety',
  };

  it('renders model and evaluation overview fields', () => {
    render(<EvaluationFormOverview {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Test Model' })).toBeInTheDocument();
    expect(screen.getByText('Ver. 1.0')).toBeInTheDocument();
    expect(screen.getByText('Evaluation Overview')).toBeInTheDocument();
    expect(screen.getByText('eval-123')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('Jan 2, 2026')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Playground')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Bias and Fairness')).toBeInTheDocument();
    expect(screen.getByText('Evaluate model safety')).toBeInTheDocument();
  });

  it('shows fallback values and organization tooltip when data is missing', () => {
    render(
      <EvaluationFormOverview
        {...defaultProps}
        modelName=""
        modelVersion=""
        organizationName={undefined}
        evalId=""
        objective=""
      />
    );

    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'CivicDataLab');
    expect(screen.getByAltText('Organization logo')).toBeInTheDocument();
  });
});
