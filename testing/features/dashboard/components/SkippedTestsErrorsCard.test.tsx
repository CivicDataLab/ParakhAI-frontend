import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SkippedTestsErrorsCard from '@/features/dashboard/components/SkippedTestsErrorsCard';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('@tabler/icons-react', () => ({
  IconMinus: () => <span data-testid="icon-minus" />,
  IconPlus: () => <span data-testid="icon-plus" />,
}));

describe('SkippedTestsErrorsCard', () => {
  it('starts collapsed and expands to show the error message', async () => {
    const user = userEvent.setup();
    render(<SkippedTestsErrorsCard errorMessage="Connection reset by peer" />);

    const toggle = screen.getByRole('button', { name: /Error leading to skipped test/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Connection reset by peer')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Connection reset by peer')).toBeInTheDocument();
    expect(screen.getByTestId('icon-minus')).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Connection reset by peer')).not.toBeInTheDocument();
  });
});
