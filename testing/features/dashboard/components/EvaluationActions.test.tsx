import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EvaluationActions from '@/features/dashboard/components/EvaluationDetail/EvaluationActions';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@tabler/icons-react', () => ({
  IconDownload: () => <span data-testid="icon-download" />,
}));

describe('EvaluationActions', () => {
  const onPrimaryAction = vi.fn();
  const defaultProps = {
    showDownloadActions: false,
    isReportReady: false,
    isPlaygroundEvaluation: false,
    isBulkPendingReview: true,
    isSavingEvaluation: false,
    isGeneratingReport: false,
    isDownloading: false,
    onPrimaryAction,
    backLink: '/dashboard/evaluations',
    backLinkText: 'Back to Evaluations',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows submit warning and enables submit for pending bulk review', async () => {
    const user = userEvent.setup();
    render(<EvaluationActions {...defaultProps} />);

    expect(
      screen.getByText(/Ready to submit\? Submitting will finalise this evaluation/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onPrimaryAction).toHaveBeenCalled();
  });

  it('disables submit when bulk review is not pending', () => {
    render(<EvaluationActions {...defaultProps} isBulkPendingReview={false} />);

    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('shows submitting state while saving', () => {
    render(<EvaluationActions {...defaultProps} isSavingEvaluation />);

    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
    expect(
      screen.queryByText(/Ready to submit\? Submitting will finalise this evaluation/i)
    ).not.toBeInTheDocument();
  });

  it('shows download actions when report is ready', async () => {
    const user = userEvent.setup();
    render(
      <EvaluationActions
        {...defaultProps}
        showDownloadActions
        isReportReady
        isBulkPendingReview={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Download Report' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Download Report' }));
    expect(onPrimaryAction).toHaveBeenCalled();
  });

  it('shows generating and downloading states for report actions', () => {
    const { rerender } = render(
      <EvaluationActions
        {...defaultProps}
        showDownloadActions
        isGeneratingReport
        isBulkPendingReview={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Generating Report...' })).toBeDisabled();
    expect(screen.getByText(/Your report is being generated/i)).toBeInTheDocument();

    rerender(
      <EvaluationActions
        {...defaultProps}
        showDownloadActions
        isReportReady
        isDownloading
        isBulkPendingReview={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Downloading...' })).toBeDisabled();
  });

  it('hides primary action for playground evaluations without download actions', () => {
    render(
      <EvaluationActions {...defaultProps} isPlaygroundEvaluation isBulkPendingReview={false} />
    );

    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Evaluations' })).toBeInTheDocument();
  });
});
