import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UPDATE_AUDIT_RESULT_MUTATION } from '@/features/ai-maker/api/bulk-evaluation-queries';
import { makeBulkTestCase } from '@/testing/fixtures/bulk-evaluation';
import { fireEvent, render, screen, waitFor } from '@/testing/utils';
import BulkTestCaseDetailSheet from './BulkTestCaseDetailSheet';

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
    mockRequest.mockResolvedValue({
      updateAuditResult: { success: true },
    });
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
});
