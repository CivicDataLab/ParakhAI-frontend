import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/testing/utils';
import AddIssueModal from './AddIssueModal';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

const issueOptions = [
  { value: 'result-1', label: 'Gender Bias' },
  { value: 'result-2', label: 'Safety Risk' },
];

const severityOptions = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

describe('AddIssueModal', () => {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (open = true) =>
    render(
      <AddIssueModal
        open={open}
        onOpenChange={onOpenChange}
        issueOptions={issueOptions}
        severityOptions={severityOptions}
        onSubmit={onSubmit}
      />
    );

  it('does not render when closed', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Issue is required')).toBeInTheDocument();
    expect(screen.getByText('Risk level is required')).toBeInTheDocument();
    expect(screen.getByText('Reasons or observations are required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits form data when all fields are valid', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.selectOptions(screen.getByLabelText('Issue'), 'result-1');
    await user.selectOptions(screen.getByLabelText('Risk Level'), 'HIGH');
    await user.type(
      screen.getByLabelText('Reasons or Observations'),
      'Observed gender bias in output'
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      resultId: 'result-1',
      label: 'Gender Bias',
      severity: 'HIGH',
      observation: 'Observed gender bias in output',
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes modal on cancel', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('resets form when modal closes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderModal();

    await user.type(screen.getByLabelText('Reasons or Observations'), 'Draft text');
    rerender(
      <AddIssueModal
        open={false}
        onOpenChange={onOpenChange}
        issueOptions={issueOptions}
        severityOptions={severityOptions}
        onSubmit={onSubmit}
      />
    );
    rerender(
      <AddIssueModal
        open={true}
        onOpenChange={onOpenChange}
        issueOptions={issueOptions}
        severityOptions={severityOptions}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByLabelText('Reasons or Observations')).toHaveValue('');
  });
});
