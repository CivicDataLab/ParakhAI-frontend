import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EVALUATION_STATUS_FILTER_OPTIONS,
  StatusFilterTabs,
} from '@/features/dashboard/components/StatusFilterTabs';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

describe('StatusFilterTabs', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders filter options and invokes onChange', async () => {
    const user = userEvent.setup();
    render(
      <StatusFilterTabs
        options={EVALUATION_STATUS_FILTER_OPTIONS}
        value="ALL"
        onChange={onChange}
      />
    );

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Failed' }));

    expect(onChange).toHaveBeenCalledWith('FAILED');
  });

  it('shows per-status counts for non-ALL tabs', () => {
    render(
      <StatusFilterTabs
        options={EVALUATION_STATUS_FILTER_OPTIONS}
        value="COMPLETED"
        onChange={onChange}
        items={[{ status: 'COMPLETED' }, { status: 'COMPLETED' }, { status: 'FAILED' }]}
      />
    );

    expect(screen.getByRole('button', { name: 'Completed(2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Failed(1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toHaveTextContent('All');
  });
});
