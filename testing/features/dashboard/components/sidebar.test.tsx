import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar, { ProfileContent } from '@/features/dashboard/components/sidebar';
import { render, screen } from '@/testing/utils';

const { mockSignIn, mockLogout } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockLogout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    target,
    rel,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    target?: string;
    rel?: string;
  }) => (
    <a href={href} onClick={onClick} target={target} rel={rel}>
      {children}
    </a>
  ),
}));

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock('@/lib/auth', () => ({
  logout: (...args: unknown[]) => mockLogout(...args),
}));

vi.mock('@/components/icons', () => ({
  Icons: { cross: () => <span data-testid="icon-cross" /> },
}));

describe('Sidebar', () => {
  const setOpen = vi.fn();
  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Docs', href: 'https://example.com/docs' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render sheet content when closed', () => {
    render(
      <Sidebar
        open={false}
        setOpen={setOpen}
        data={navItems}
        session={null}
        status="unauthenticated"
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders navigation links and login button for unauthenticated users', async () => {
    const user = userEvent.setup();
    render(
      <Sidebar open setOpen={setOpen} data={navItems} session={null} status="unauthenticated" />
    );

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      'https://example.com/docs'
    );

    await user.click(screen.getByRole('button', { name: 'LOGIN / SIGN UP' }));
    expect(mockSignIn).toHaveBeenCalledWith('keycloak');
  });

  it('shows profile content for authenticated users', () => {
    render(
      <Sidebar
        open
        setOpen={setOpen}
        data={navItems}
        session={{
          user: { name: 'Jane Doe', email: 'jane@example.com' },
          expires: '2099-01-01',
        }}
        status="authenticated"
      />
    );

    expect(screen.getByTestId('avatar')).toHaveTextContent('Jane Doe');
  });

  it('closes sidebar when close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Sidebar open setOpen={setOpen} data={navItems} session={null} status="unauthenticated" />
    );

    await user.click(screen.getByTestId('icon-cross').closest('button')!);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('closes sidebar when a navigation link is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Sidebar open setOpen={setOpen} data={navItems} session={null} status="unauthenticated" />
    );

    await user.click(screen.getByRole('link', { name: 'Dashboard' }));

    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('opens external links in a new tab with noopener', () => {
    render(
      <Sidebar open setOpen={setOpen} data={navItems} session={null} status="unauthenticated" />
    );

    const docsLink = screen.getByRole('link', { name: 'Docs' });
    expect(docsLink).toHaveAttribute('href', 'https://example.com/docs');
    expect(docsLink).toHaveAttribute('target', '_blank');
    expect(docsLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows loading spinner while session status is loading', () => {
    render(<Sidebar open setOpen={setOpen} data={navItems} session={null} status="loading" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(screen.queryByRole('button', { name: 'LOGIN / SIGN UP' })).not.toBeInTheDocument();
  });
});

describe('ProfileContent', () => {
  const onClose = vi.fn();
  const session = {
    user: { name: 'Jane Doe', email: 'jane@example.com' },
    expires: '2099-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs out and closes sidebar popover', async () => {
    const user = userEvent.setup();

    render(<ProfileContent session={session} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Log Out' }));

    expect(onClose).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalledWith('/');
  });

  it('closes popover when profile link is clicked', async () => {
    const user = userEvent.setup();

    render(<ProfileContent session={session} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Jane Doe' }));
    expect(screen.getByTestId('popover')).toHaveAttribute('data-open', 'true');

    await user.click(screen.getByRole('link', { name: 'Evaluation Workspace' }));

    expect(screen.getByTestId('popover')).toHaveAttribute('data-open', 'false');
  });
});
