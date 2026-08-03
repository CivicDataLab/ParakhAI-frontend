import { describe, expect, it, vi } from 'vitest';
import EvaluationProgressSection from '@/features/dashboard/components/EvaluationProgressSection';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

describe('EvaluationProgressSection', () => {
  it('renders progress text and progress bar', () => {
    render(<EvaluationProgressSection progressPercent={42} />);

    expect(
      screen.getByText('Evaluation results will load once the evaluation is completed.')
    ).toBeInTheDocument();
    expect(screen.getByText('Evaluation Progress : 42%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });
});
