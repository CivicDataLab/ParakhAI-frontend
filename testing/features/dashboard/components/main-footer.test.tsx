import { describe, expect, it, vi } from 'vitest';
import MainFooter from '@/features/dashboard/components/main-footer';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('next/image', () => ({
  default: (props: { alt: string; src: string }) => <img alt={props.alt} src={props.src} />,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    'aria-label'?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/icons', () => ({
  Icons: {
    github: () => <span data-testid="icon-github" />,
    linkedin: () => <span data-testid="icon-linkedin" />,
    twitter: () => <span data-testid="icon-twitter" />,
    facebook: () => <span data-testid="icon-facebook" />,
  },
}));

describe('MainFooter', () => {
  it('renders branding and social links', () => {
    render(<MainFooter />);

    expect(screen.getByText('made by')).toBeInTheDocument();
    expect(screen.getByAltText('CivicDataLab logo')).toHaveAttribute(
      'src',
      '/images/logos/CDL_Logo-Single Color1.png'
    );
    expect(screen.getByLabelText('CivicDataLab website')).toHaveAttribute(
      'href',
      'https://www.civicdatalab.in'
    );
    expect(screen.getByTestId('icon-github').closest('a')).toHaveAttribute(
      'href',
      'https://github.com/civicdatalab'
    );
    expect(screen.getByTestId('icon-linkedin').closest('a')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/company/civicdatalab'
    );
    expect(screen.getByTestId('icon-twitter').closest('a')).toHaveAttribute(
      'href',
      'https://twitter.com/civicdatalab'
    );
    expect(screen.getByTestId('icon-facebook').closest('a')).toHaveAttribute(
      'href',
      'https://facebook.com/civicdatalab'
    );
  });
});
