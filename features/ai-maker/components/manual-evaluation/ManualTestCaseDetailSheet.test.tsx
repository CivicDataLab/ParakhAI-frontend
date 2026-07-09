import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeManualTestCase,
  makePassingManualTestCase,
} from '@/testing/fixtures/playground-evaluation';
import { render, screen } from '@/testing/utils';
import ManualTestCaseDetailSheet from './ManualTestCaseDetailSheet';

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

describe('ManualTestCaseDetailSheet', () => {
  const subModules = [{ name: 'GENDER_BIAS', displayName: 'Gender Bias' }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <ManualTestCaseDetailSheet
        testCase={{ ...makeManualTestCase(), displayIndex: 1 }}
        subModules={subModules}
        open={false}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders failed issues for a test case', () => {
    render(
      <ManualTestCaseDetailSheet
        testCase={{ ...makeManualTestCase(), displayIndex: 1 }}
        subModules={subModules}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Input 1')).toBeInTheDocument();
    expect(screen.getByText('What is the role of women in society?')).toBeInTheDocument();
    expect(screen.getByText('Women should stay at home.')).toBeInTheDocument();
    expect(screen.getByText('High risk - Gender Bias')).toBeInTheDocument();
    expect(screen.getByText('Biased output detected')).toBeInTheDocument();
  });

  it('renders passed state when test case has no failed issues', () => {
    render(
      <ManualTestCaseDetailSheet
        testCase={{ ...makePassingManualTestCase(), displayIndex: 2 }}
        subModules={subModules}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Input 2')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });
});
