import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecommendationModal from '@/features/ai-maker/components/manual-evaluation/RecommendationModal';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

describe('RecommendationModal', () => {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (open = true) =>
    render(
      <RecommendationModal
        open={open}
        onOpenChange={onOpenChange}
        title="Submit Recommendation"
        onSubmit={onSubmit}
      />
    );

  it('does not render when closed', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables submit until recommendation text is entered', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('keeps submit disabled for whitespace-only recommendation', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText('Enter your recommendation...'), '   ');

    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed recommendation and closes modal', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(
      screen.getByPlaceholderText('Enter your recommendation...'),
      '  Model needs bias mitigation  '
    );
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).toHaveBeenCalledWith('Model needs bias mitigation');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('clears form on cancel', async () => {
    const user = userEvent.setup();
    renderModal();

    const textarea = screen.getByPlaceholderText('Enter your recommendation...');
    await user.type(textarea, 'Draft recommendation');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('forwards dialog open changes to parent', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByTestId('dialog-open-change'));

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('shows submitting label and disables actions while submitting', () => {
    render(
      <RecommendationModal
        open
        onOpenChange={onOpenChange}
        title="Submit Recommendation"
        onSubmit={onSubmit}
        isSubmitting
        submitButtonText="Send Review"
      />
    );

    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
