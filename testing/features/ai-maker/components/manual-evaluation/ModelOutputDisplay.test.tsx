import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ModelOutputDisplay from '@/features/ai-maker/components/manual-evaluation/ModelOutputDisplay';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

describe('ModelOutputDisplay', () => {
  const onStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDisplay = (
    overrides: Partial<{
      output: string;
      latencyMs: number;
      status: 'PASSED' | 'FAILED' | null;
    }> = {}
  ) =>
    render(
      <ModelOutputDisplay
        output={overrides.output ?? 'Model response text'}
        latencyMs={overrides.latencyMs}
        status={overrides.status ?? null}
        onStatusChange={onStatusChange}
      />
    );

  it('renders model output as markdown', () => {
    renderDisplay({ output: '**Bold** response' });

    expect(screen.getByText('Model Output')).toBeInTheDocument();
    expect(screen.getByTestId('markdown')).toHaveTextContent('**Bold** response');
  });

  it('shows placeholder when output is empty', () => {
    renderDisplay({ output: '' });

    expect(screen.getByText('No output received')).toBeInTheDocument();
  });

  it('shows latency tag when latencyMs is provided', () => {
    renderDisplay({ latencyMs: 123.7 });

    expect(screen.getByTestId('tag')).toHaveTextContent('124ms');
  });

  it('does not show latency tag when latencyMs is omitted', () => {
    renderDisplay();

    expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
  });

  it('calls onStatusChange when passed or failed is clicked', async () => {
    const user = userEvent.setup();
    renderDisplay();

    await user.click(screen.getByRole('button', { name: /Passed/ }));
    expect(onStatusChange).toHaveBeenCalledWith('PASSED');

    await user.click(screen.getByRole('button', { name: /Failed/ }));
    expect(onStatusChange).toHaveBeenCalledWith('FAILED');
  });

  it('applies selected styling for passed and failed states', () => {
    const { rerender } = renderDisplay({ status: 'PASSED' });

    expect(screen.getByRole('button', { name: /Passed/ })).toHaveClass('border-green-600');
    expect(screen.getByRole('button', { name: /Failed/ })).not.toHaveClass('border-red-600');

    rerender(
      <ModelOutputDisplay output="output" status="FAILED" onStatusChange={onStatusChange} />
    );

    expect(screen.getByRole('button', { name: /Failed/ })).toHaveClass('border-red-600');
  });
});
