import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UPDATE_AUDIT_RESULT_MUTATION } from '@/features/ai-maker/api/bulk-evaluation-queries';
import BulkTestCaseDetailSheet from '@/features/dashboard/components/BulkTestCaseDetailSheet';
import { makeBulkTestCase } from '@/testing/fixtures/bulk-evaluation';
import { mockToast } from '@/testing/mocks/opub-ui';
import { fireEvent, render, screen, waitFor } from '@/testing/utils';

const mockRequest = vi.fn();

vi.mock('@/lib/graphql-client', () => ({
  useGraphQL: () => ({ request: mockRequest }),
}));

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('@/components/icons', () => ({
  Icons: { cross: 'cross', info: 'info' },
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock('@tabler/icons-react', () => ({
  IconTrash: () => <span data-testid="icon-trash" />,
}));

describe('BulkTestCaseDetailSheet', () => {
  const testCase = makeBulkTestCase();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockRequest.mockResolvedValue({
      updateAuditResult: { success: true },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render content when closed', () => {
    render(<BulkTestCaseDetailSheet testCase={testCase} open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders test case risks and content when open', () => {
    render(<BulkTestCaseDetailSheet testCase={testCase} open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('Input 1')).toBeInTheDocument();
    expect(screen.getByText(testCase.fullInputText)).toBeInTheDocument();
    expect(screen.getByText(testCase.output)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Biased response detected')).toBeInTheDocument();
  });

  it('shows no issues message when risks are empty', () => {
    render(
      <BulkTestCaseDetailSheet
        testCase={makeBulkTestCase({ risks: [] })}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('No issues identified for this input.')).toBeInTheDocument();
  });

  it('triggers save when severity changes in editable mode', async () => {
    render(
      <BulkTestCaseDetailSheet
        testCase={testCase}
        open={true}
        onOpenChange={vi.fn()}
        isEditable={true}
        orgId="org-1"
      />
    );

    fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'MEDIUM' } });

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        UPDATE_AUDIT_RESULT_MUTATION,
        {
          input: {
            resultId: 'result-1',
            evaluatorRiskLevel: 'MEDIUM_RISK',
          },
        },
        { organization: 'org-1' }
      );
    });
  });

  it('opens add issue modal when editable and metrics allow', async () => {
    render(
      <BulkTestCaseDetailSheet
        testCase={testCase}
        open={true}
        onOpenChange={vi.fn()}
        isEditable={true}
        selectedMetricCount={2}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add an issue' }));

    expect(screen.getByRole('dialog', { name: 'Add an Issue' })).toBeInTheDocument();
  });

  it('closes sheet when close button is clicked', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(<BulkTestCaseDetailSheet testCase={testCase} open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Close detail panel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('notifies parent when issues change in editable mode', async () => {
    const onIssuesChange = vi.fn();

    render(
      <BulkTestCaseDetailSheet
        testCase={testCase}
        open={true}
        onOpenChange={vi.fn()}
        isEditable={true}
        onIssuesChange={onIssuesChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'LOW' } });

    await waitFor(() => {
      expect(onIssuesChange).toHaveBeenCalledWith(
        testCase.id,
        expect.arrayContaining([expect.objectContaining({ severity: 'LOW', resultId: 'result-1' })])
      );
    });
  });

  it('removes issue and schedules no-risk save in editable mode', async () => {
    const user = userEvent.setup();
    const onIssuesChange = vi.fn();

    render(
      <BulkTestCaseDetailSheet
        testCase={testCase}
        open={true}
        onOpenChange={vi.fn()}
        isEditable={true}
        onIssuesChange={onIssuesChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Remove issue 1' }));

    expect(screen.getByText('No issues identified for this input.')).toBeInTheDocument();
    expect(onIssuesChange).toHaveBeenCalledWith(testCase.id, []);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        UPDATE_AUDIT_RESULT_MUTATION,
        {
          input: {
            resultId: 'result-1',
            evaluatorSuccess: true,
            evaluatorRiskLevel: 'NO_RISK',
          },
        },
        undefined
      );
    });
  });

  it('debounces observation saves in editable mode', async () => {
    vi.useFakeTimers();

    render(
      <BulkTestCaseDetailSheet
        testCase={testCase}
        open={true}
        onOpenChange={vi.fn()}
        isEditable={true}
      />
    );

    fireEvent.change(screen.getByLabelText('Reasons and Observations'), {
      target: { value: 'Updated observation text' },
    });

    expect(mockRequest).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(mockRequest).toHaveBeenCalledWith(
      UPDATE_AUDIT_RESULT_MUTATION,
      {
        input: {
          resultId: 'result-1',
          evaluatorReason: 'Updated observation text',
        },
      },
      undefined
    );
  });

  it('shows saving indicator while persisting changes', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    mockRequest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    render(
      <BulkTestCaseDetailSheet
        testCase={testCase}
        open={true}
        onOpenChange={vi.fn()}
        isEditable={true}
      />
    );

    fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'MEDIUM' } });

    await waitFor(() => {
      expect(screen.getByText('Saving…')).toBeInTheDocument();
    });

    resolveRequest({ updateAuditResult: { success: true } });

    await waitFor(() => {
      expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
    });
  });

  it('shows toast when save fails', async () => {
    mockRequest.mockResolvedValue({
      updateAuditResult: { success: false, message: 'Permission denied' },
    });

    render(
      <BulkTestCaseDetailSheet
        testCase={testCase}
        open={true}
        onOpenChange={vi.fn()}
        isEditable={true}
      />
    );

    fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'LOW' } });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Permission denied');
    });
  });

  it('disables add issue when all metrics are represented', () => {
    render(
      <BulkTestCaseDetailSheet
        testCase={testCase}
        open={true}
        onOpenChange={vi.fn()}
        isEditable={true}
        selectedMetricCount={1}
      />
    );

    expect(screen.getByRole('button', { name: 'Add an issue' })).toBeDisabled();
  });

  it('renders read-only observation label when not editable', () => {
    render(<BulkTestCaseDetailSheet testCase={testCase} open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('Reasons and Observations')).toBeInTheDocument();
    expect(screen.queryByText('Reasons and Observations (click to edit)')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove issue 1' })).not.toBeInTheDocument();
  });

  it('clears issues when test case is removed', () => {
    const { rerender } = render(
      <BulkTestCaseDetailSheet testCase={testCase} open={true} onOpenChange={vi.fn()} />
    );

    expect(screen.getByDisplayValue('Biased response detected')).toBeInTheDocument();

    rerender(<BulkTestCaseDetailSheet testCase={null} open={true} onOpenChange={vi.fn()} />);

    expect(screen.queryByText('Input 1')).not.toBeInTheDocument();
  });
});

describe('BulkTestCaseDetailSheet add issue flow', () => {
  const testCase = makeBulkTestCase({
    allMetricResults: [
      { resultId: 'result-1', label: 'Gender Bias', metricKey: 'gender_bias' },
      { resultId: 'result-2', label: 'Safety Risk', metricKey: 'safety_risk' },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockResolvedValue({
      updateAuditResult: { success: true },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('submits new issue from add issue modal', async () => {
    const user = userEvent.setup();
    const onIssuesChange = vi.fn();

    render(
      <BulkTestCaseDetailSheet
        testCase={testCase}
        open={true}
        onOpenChange={vi.fn()}
        isEditable={true}
        selectedMetricCount={2}
        onIssuesChange={onIssuesChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add an issue' }));
    fireEvent.change(screen.getByLabelText('Issue'), { target: { value: 'result-2' } });
    fireEvent.change(screen.getByLabelText('Risk Level'), { target: { value: 'MEDIUM' } });
    fireEvent.change(screen.getByLabelText('Reasons or Observations'), {
      target: { value: 'New safety concern' },
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onIssuesChange).toHaveBeenCalledWith(
        testCase.id,
        expect.arrayContaining([
          expect.objectContaining({
            resultId: 'result-2',
            severity: 'MEDIUM',
            observation: 'New safety concern',
          }),
        ])
      );
      expect(mockRequest).toHaveBeenCalledWith(
        UPDATE_AUDIT_RESULT_MUTATION,
        {
          input: {
            resultId: 'result-2',
            evaluatorSuccess: false,
            evaluatorRiskLevel: 'MEDIUM_RISK',
            evaluatorReason: 'New safety concern',
          },
        },
        undefined
      );
    });
  });
});
