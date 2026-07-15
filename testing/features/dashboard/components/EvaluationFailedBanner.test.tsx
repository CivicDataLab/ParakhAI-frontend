import { describe, expect, it, vi } from 'vitest';
import EvaluationFailedBanner from '@/features/dashboard/components/EvaluationFailedBanner';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

describe('EvaluationFailedBanner', () => {
  it('renders failure messaging and formatted error details', () => {
    render(
      <EvaluationFailedBanner
        errorDetails={{ message: 'Model timeout' }}
        errorMessage="Request failed"
      />
    );

    expect(screen.getByText('Evaluation failed')).toBeInTheDocument();
    expect(
      screen.getByText('None of the test cases returned a response from the model.')
    ).toBeInTheDocument();
    expect(screen.getByText('Error details:')).toBeInTheDocument();
    expect(screen.getByText('Model timeout')).toBeInTheDocument();
  });

  it('shows fallback text when no error details are available', () => {
    render(<EvaluationFailedBanner errorDetails={null} errorMessage={null} />);

    expect(screen.getByText('No additional details available.')).toBeInTheDocument();
  });
});
