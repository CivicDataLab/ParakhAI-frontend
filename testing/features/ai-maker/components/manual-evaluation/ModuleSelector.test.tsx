import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ModuleSelector from '@/features/ai-maker/components/manual-evaluation/ModuleSelector';
import { makeModuleProgress } from '@/testing/fixtures/playground-evaluation';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

describe('ModuleSelector', () => {
  const onSelectModule = vi.fn();
  const getModuleDisplayName = (name: string) =>
    name === 'BIAS_FAIRNESS' ? 'Bias and Fairness' : name;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSelector = (
    overrides: Partial<{
      modules: string[];
      moduleProgress: ReturnType<typeof makeModuleProgress>[];
      selectedModule: string | null;
    }> = {}
  ) =>
    render(
      <ModuleSelector
        modules={overrides.modules ?? ['BIAS_FAIRNESS', 'PRIVACY_SAFETY']}
        moduleProgress={
          overrides.moduleProgress ?? [
            makeModuleProgress({
              module: 'BIAS_FAIRNESS',
              testCaseCount: 2,
              passedCount: 1,
              failedCount: 1,
            }),
          ]
        }
        selectedModule={overrides.selectedModule ?? null}
        onSelectModule={onSelectModule}
        getModuleDisplayName={getModuleDisplayName}
      />
    );

  it('renders heading and module cards with descriptions', () => {
    renderSelector();

    expect(screen.getByText('Select Module to Test')).toBeInTheDocument();
    expect(screen.getByText('Bias and Fairness')).toBeInTheDocument();
    expect(screen.getByText('Checks whether model perpetuates stereotypes')).toBeInTheDocument();
    expect(screen.getByText('PRIVACY_SAFETY')).toBeInTheDocument();
    expect(screen.getByText('Ensures personal data is not exposed')).toBeInTheDocument();
  });

  it('shows progress tags from moduleProgress and defaults when missing', () => {
    renderSelector();

    expect(screen.getByText('2 Test Cases')).toBeInTheDocument();
    expect(screen.getByText('1 Failed')).toBeInTheDocument();
    expect(screen.getByText('1 Passed')).toBeInTheDocument();
    expect(screen.getByText('0 Test Cases')).toBeInTheDocument();
  });

  it('calls onSelectModule when a module card is clicked', async () => {
    const user = userEvent.setup();
    renderSelector({ selectedModule: 'BIAS_FAIRNESS' });

    await user.click(screen.getByRole('button', { name: /Bias and Fairness/ }));

    expect(onSelectModule).toHaveBeenCalledWith('BIAS_FAIRNESS');
  });
});
