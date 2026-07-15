import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FailureDetails from '@/features/ai-maker/components/manual-evaluation/FailureDetails';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

describe('FailureDetails', () => {
  const subModules = [
    { name: 'GENDER_BIAS', displayName: 'Gender Bias' },
    { name: 'STEREOTYPE', displayName: 'Stereotype' },
  ];

  const onIssueTypeChange = vi.fn();
  const onSeverityChange = vi.fn();
  const onCommentsChange = vi.fn();
  const onIdealOutputChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDetails = (
    overrides: Partial<{
      issueType: string;
      severity: string;
      comments: string;
      idealOutput: string;
    }> = {}
  ) =>
    render(
      <FailureDetails
        subModules={subModules}
        issueType={overrides.issueType ?? ''}
        severity={overrides.severity ?? ''}
        comments={overrides.comments ?? ''}
        idealOutput={overrides.idealOutput ?? ''}
        onIssueTypeChange={onIssueTypeChange}
        onSeverityChange={onSeverityChange}
        onCommentsChange={onCommentsChange}
        onIdealOutputChange={onIdealOutputChange}
      />
    );

  it('renders failure details heading and form fields', () => {
    renderDetails();

    expect(screen.getByText('Failure Details')).toBeInTheDocument();
    expect(
      screen.getByText('Please provide details about the issue found in the model output.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Issue Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Severity')).toBeInTheDocument();
    expect(screen.getByLabelText('Comments')).toBeInTheDocument();
    expect(screen.getByLabelText('Ideal Output')).toBeInTheDocument();
  });

  it('maps subModules to issue type options', () => {
    renderDetails();

    expect(screen.getByRole('option', { name: 'Gender Bias' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Stereotype' })).toBeInTheDocument();
  });

  it('calls change handlers when fields are updated', async () => {
    const user = userEvent.setup();
    renderDetails();

    await user.selectOptions(screen.getByLabelText('Issue Type'), 'GENDER_BIAS');
    await user.selectOptions(screen.getByLabelText('Severity'), 'HIGH');
    await user.type(screen.getByLabelText('Comments'), 'Biased response');
    await user.type(screen.getByLabelText('Ideal Output'), 'Neutral response');

    expect(onIssueTypeChange).toHaveBeenCalledWith('GENDER_BIAS');
    expect(onSeverityChange).toHaveBeenCalledWith('HIGH');
    expect(onCommentsChange).toHaveBeenCalled();
    expect(onIdealOutputChange).toHaveBeenCalled();
  });

  it('displays current field values', () => {
    renderDetails({
      issueType: 'GENDER_BIAS',
      severity: 'MEDIUM',
      comments: 'Existing comment',
      idealOutput: 'Better output',
    });

    expect(screen.getByLabelText('Issue Type')).toHaveValue('GENDER_BIAS');
    expect(screen.getByLabelText('Severity')).toHaveValue('MEDIUM');
    expect(screen.getByLabelText('Comments')).toHaveValue('Existing comment');
    expect(screen.getByLabelText('Ideal Output')).toHaveValue('Better output');
  });
});
