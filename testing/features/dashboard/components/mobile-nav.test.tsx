import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MobileNav from '@/features/dashboard/components/mobile-nav';
import { render, screen } from '@/testing/utils';

const sidebarSpy = vi.fn();

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('@/components/icons', () => ({
  Icons: { menu: () => <span data-testid="icon-menu" /> },
}));

vi.mock('@/features/dashboard/components/sidebar', () => ({
  default: (props: {
    open: boolean;
    setOpen: (next: boolean) => void;
    data: Array<{ label: string; href: string }>;
  }) => {
    sidebarSpy(props);
    return props.open ? <div data-testid="mobile-sidebar">Open</div> : null;
  },
}));

describe('MobileNav', () => {
  const navigationLinks = [{ label: 'Dashboard', href: '/dashboard' }];

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove('mobile-menu-open');
  });

  it('opens sidebar when hamburger is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileNav navigationLinks={navigationLinks} session={null} status="unauthenticated" />);

    expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();
    expect(document.documentElement.classList.contains('mobile-menu-open')).toBe(true);
    expect(sidebarSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        data: navigationLinks,
      })
    );
  });
});
