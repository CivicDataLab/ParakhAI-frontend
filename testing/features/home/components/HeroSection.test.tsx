import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HeroSection from '@/features/home/components/HeroSection';
import { render, screen } from '@/testing/utils';

const { mockPush, mockSignIn, mockUseSession } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSignIn: vi.fn(),
  mockUseSession: vi.fn((): { data: { user: { name: string } } | null } => ({ data: null })),
}));

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('next/image', () => ({
  default: (props: { alt: string; src: string }) => <img alt={props.alt} src={props.src} />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock('@/components/icons', () => ({
  Icons: { arrowRight: () => <span data-testid="arrow-right" /> },
}));

describe('HeroSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({ data: null });
  });

  it('renders hero heading and Get Started button', () => {
    render(<HeroSection />);

    expect(screen.getByText(/Build AI that's trustworthy/i)).toBeInTheDocument();
    expect(screen.getByText(/from day one/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get Started/i })).toBeInTheDocument();
    expect(screen.getByAltText('Hero Background')).toBeInTheDocument();
  });

  it('signs in via Keycloak when Get Started is clicked without a session', async () => {
    const user = userEvent.setup();
    render(<HeroSection />);

    await user.click(screen.getByRole('button', { name: /Get Started/i }));

    expect(mockSignIn).toHaveBeenCalledWith('keycloak', { callbackUrl: '/dashboard' });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates to dashboard when Get Started is clicked with a session', async () => {
    mockUseSession.mockReturnValue({ data: { user: { name: 'Test User' } } });
    const user = userEvent.setup();
    render(<HeroSection />);

    await user.click(screen.getByRole('button', { name: /Get Started/i }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
