import { describe, expect, it, vi } from 'vitest';
import DashboardGuard from '@/features/dashboard/components/DashboardGuard';
import { render, screen } from '@/testing/utils';

const sessionGuardSpy = vi.fn();

vi.mock('@/components/common/SessionGuard', () => ({
  SessionGuard: (props: { children: React.ReactNode; fallback?: React.ReactNode }) => {
    sessionGuardSpy(props);
    return <div data-testid="session-guard">{props.children}</div>;
  },
}));

describe('DashboardGuard', () => {
  it('wraps children with SessionGuard', () => {
    render(
      <DashboardGuard>
        <p>Dashboard content</p>
      </DashboardGuard>
    );

    expect(screen.getByTestId('session-guard')).toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('passes a session verification fallback to SessionGuard', () => {
    render(
      <DashboardGuard>
        <p>Dashboard content</p>
      </DashboardGuard>
    );

    const [{ fallback }] = sessionGuardSpy.mock.calls.at(-1)!;
    render(fallback as React.ReactElement);

    expect(screen.getByText('Verifying your session...')).toBeInTheDocument();
  });
});
