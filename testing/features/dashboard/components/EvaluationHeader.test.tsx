import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EvaluationHeader from '@/features/dashboard/components/EvaluationDetail/EvaluationHeader';
import { makeBulkAudit } from '@/testing/fixtures/bulk-evaluation';
import { mockToast } from '@/testing/mocks/opub-ui';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

describe('EvaluationHeader', () => {
  const onNameChange = vi.fn();
  const onNameBlur = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders editable name, status tags, and back link', () => {
    render(
      <EvaluationHeader
        audit={makeBulkAudit({ status: 'PENDING_REVIEW', evaluationMode: 'BULK' })}
        editableName="My Evaluation"
        onNameChange={onNameChange}
        onNameBlur={onNameBlur}
        backLink="/dashboard/evaluations"
        backLinkText="Back to Evaluations"
      />
    );

    expect(screen.getByLabelText('Evaluation Name')).toHaveValue('My Evaluation');
    const tags = screen.getAllByTestId('tag');
    expect(tags[0]).toHaveTextContent('PENDING REVIEW');
    expect(tags[1]).toHaveTextContent('Bulk Evaluation');
    expect(screen.getByRole('button', { name: 'Back to Evaluations' })).toBeInTheDocument();
  });

  it('calls onNameChange and onNameBlur for name edits', async () => {
    const user = userEvent.setup();
    render(
      <EvaluationHeader
        audit={makeBulkAudit()}
        editableName="Draft"
        onNameChange={onNameChange}
        onNameBlur={onNameBlur}
        backLink="/back"
        backLinkText="Back"
      />
    );

    await user.type(screen.getByLabelText('Evaluation Name'), 'X');
    expect(onNameChange).toHaveBeenCalled();

    await user.tab();
    expect(onNameBlur).toHaveBeenCalled();
  });

  it('submits name on Enter and dismisses toast when navigating back', async () => {
    const user = userEvent.setup();
    render(
      <EvaluationHeader
        audit={makeBulkAudit()}
        editableName="Draft"
        onNameChange={onNameChange}
        onNameBlur={onNameBlur}
        backLink="/back"
        backLinkText="Back"
      />
    );

    await user.type(screen.getByLabelText('Evaluation Name'), '{Enter}');
    expect(onNameBlur).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(mockToast.dismiss).toHaveBeenCalled();
  });
});
