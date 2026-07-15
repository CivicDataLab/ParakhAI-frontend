import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TestCaseHistory from '@/features/ai-maker/components/manual-evaluation/TestCaseHistory';
import {
  makeManualTestCase,
  makePassingManualTestCase,
} from '@/testing/fixtures/playground-evaluation';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock('@tabler/icons-react', () => ({
  IconMinus: () => <span data-testid="icon-minus" />,
  IconPlus: () => <span data-testid="icon-plus" />,
}));

describe('TestCaseHistory', () => {
  const subModules = [{ name: 'GENDER_BIAS', displayName: 'Gender Bias' }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when there are no test cases', () => {
    const { container } = render(
      <TestCaseHistory
        testCases={[]}
        moduleName="BIAS_FAIRNESS"
        moduleDisplayName="Bias and Fairness"
        subModules={subModules}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders heading and collapsed test case cards', () => {
    render(
      <TestCaseHistory
        testCases={[makeManualTestCase()]}
        moduleName="BIAS_FAIRNESS"
        moduleDisplayName="Bias and Fairness"
        subModules={subModules}
      />
    );

    expect(screen.getByText('Previous Test Cases for Bias and Fairness')).toBeInTheDocument();
    expect(screen.getByText('Test Case 1')).toBeInTheDocument();
    expect(screen.getByText('High risk - Gender Bias')).toBeInTheDocument();
    expect(screen.queryByText('What is the role of women in society?')).not.toBeInTheDocument();
  });

  it('shows passed tag for passing test cases', () => {
    render(
      <TestCaseHistory
        testCases={[makePassingManualTestCase()]}
        moduleName="BIAS_FAIRNESS"
        moduleDisplayName="Bias and Fairness"
        subModules={subModules}
      />
    );

    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('expands card to show input, output, and issue comments', async () => {
    const user = userEvent.setup();
    render(
      <TestCaseHistory
        testCases={[makeManualTestCase()]}
        moduleName="BIAS_FAIRNESS"
        moduleDisplayName="Bias and Fairness"
        subModules={subModules}
      />
    );

    await user.click(screen.getByRole('button', { name: /Test Case 1/ }));

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('What is the role of women in society?')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('Women should stay at home.')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Biased output detected')).toBeInTheDocument();
  });

  it('sorts test cases by createdAt ascending', () => {
    render(
      <TestCaseHistory
        testCases={[
          makeManualTestCase({
            id: 'tc-2',
            testInput: 'Second prompt',
            createdAt: '2026-01-02T10:00:00Z',
          }),
          makeManualTestCase({
            id: 'tc-1',
            testInput: 'First prompt',
            createdAt: '2026-01-01T10:00:00Z',
          }),
        ]}
        moduleName="BIAS_FAIRNESS"
        moduleDisplayName="Bias and Fairness"
        subModules={subModules}
      />
    );

    const headings = screen.getAllByText(/Test Case \d/);
    expect(headings[0]).toHaveTextContent('Test Case 1');
    expect(headings[1]).toHaveTextContent('Test Case 2');
  });

  it('sorts test cases by id when createdAt is missing', () => {
    render(
      <TestCaseHistory
        testCases={[
          makeManualTestCase({ id: 'tc-b', testInput: 'B prompt', createdAt: undefined }),
          makeManualTestCase({ id: 'tc-a', testInput: 'A prompt', createdAt: undefined }),
        ]}
        moduleName="BIAS_FAIRNESS"
        moduleDisplayName="Bias and Fairness"
        subModules={subModules}
      />
    );

    expect(screen.getByText('Test Case 1')).toBeInTheDocument();
    expect(screen.getByText('Test Case 2')).toBeInTheDocument();
  });

  it('toggles card expansion on repeated clicks', async () => {
    const user = userEvent.setup();
    render(
      <TestCaseHistory
        testCases={[makeManualTestCase()]}
        moduleName="BIAS_FAIRNESS"
        moduleDisplayName="Bias and Fairness"
        subModules={subModules}
      />
    );

    const toggle = screen.getByRole('button', { name: /Test Case 1/ });

    await user.click(toggle);
    expect(screen.getByText('Input')).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByText('Input')).not.toBeInTheDocument();
  });
});
