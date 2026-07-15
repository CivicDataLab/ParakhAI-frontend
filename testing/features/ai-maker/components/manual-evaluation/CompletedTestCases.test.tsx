import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompletedTestCases from '@/features/ai-maker/components/manual-evaluation/CompletedTestCases';
import {
  makeManualTestCase,
  makePassingManualTestCase,
} from '@/testing/fixtures/playground-evaluation';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('@/features/ai-maker/components/manual-evaluation/ManualTestCaseDetailSheet', () => ({
  default: ({ open, testCase }: { open: boolean; testCase: { displayIndex: number } | null }) =>
    open && testCase ? (
      <div data-testid="manual-detail-sheet">Detail for Input {testCase.displayIndex}</div>
    ) : null,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock('@tabler/icons-react', () => ({
  IconArrowsDiagonal: () => <span data-testid="icon-diagonal" />,
}));

describe('CompletedTestCases', () => {
  const subModules = [{ name: 'GENDER_BIAS', displayName: 'Gender Bias' }];
  const getModuleDisplayName = (name: string) => name;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when there are no test cases', () => {
    const { container } = render(
      <CompletedTestCases
        testCases={[]}
        modules={['BIAS_FAIRNESS']}
        subModules={subModules}
        getModuleDisplayName={getModuleDisplayName}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders failed test case cards with risk tags', () => {
    render(
      <CompletedTestCases
        testCases={[makeManualTestCase()]}
        modules={['BIAS_FAIRNESS']}
        subModules={subModules}
        getModuleDisplayName={getModuleDisplayName}
      />
    );

    expect(screen.getByText('Completed Test Cases')).toBeInTheDocument();
    expect(screen.getByText('What is the role of women in society?')).toBeInTheDocument();
    expect(screen.getByText('High risk - Gender Bias')).toBeInTheDocument();
  });

  it('renders passed tag for passing test cases', () => {
    render(
      <CompletedTestCases
        testCases={[makePassingManualTestCase()]}
        modules={['BIAS_FAIRNESS']}
        subModules={subModules}
        getModuleDisplayName={getModuleDisplayName}
      />
    );

    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('sorts test cases by createdAt ascending', () => {
    render(
      <CompletedTestCases
        testCases={[
          makeManualTestCase({
            id: 'later',
            testInput: 'Later input',
            createdAt: '2026-01-02T10:00:00Z',
          }),
          makeManualTestCase({
            id: 'earlier',
            testInput: 'Earlier input',
            createdAt: '2026-01-01T10:00:00Z',
          }),
        ]}
        modules={['BIAS_FAIRNESS']}
        subModules={subModules}
        getModuleDisplayName={getModuleDisplayName}
      />
    );

    const cards = screen.getAllByRole('button', { name: /View details for input/ });
    expect(cards[0]).toHaveAccessibleName('View details for input 1');
    expect(screen.getByText('Earlier input')).toBeInTheDocument();
    expect(screen.getByText('Later input')).toBeInTheDocument();
  });

  it('opens detail sheet when a card is clicked', async () => {
    const user = userEvent.setup();

    render(
      <CompletedTestCases
        testCases={[makeManualTestCase()]}
        modules={['BIAS_FAIRNESS']}
        subModules={subModules}
        getModuleDisplayName={getModuleDisplayName}
      />
    );

    await user.click(screen.getByRole('button', { name: 'View details for input 1' }));

    expect(screen.getByTestId('manual-detail-sheet')).toHaveTextContent('Detail for Input 1');
  });
});
