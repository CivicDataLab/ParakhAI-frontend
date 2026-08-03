import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import SectorsSection from '@/features/home/components/SectorsSection';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

vi.mock('next/image', () => ({
  default: (props: { alt: string; src: string }) => <img alt={props.alt} src={props.src} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('SectorsSection', () => {
  it('renders section heading', () => {
    render(<SectorsSection />);

    expect(screen.getByText('Improving AI across domains')).toBeInTheDocument();
  });

  it('renders sector names including HEALTHCARE', () => {
    render(<SectorsSection />);

    expect(screen.getByText('HEALTHCARE')).toBeInTheDocument();
    expect(screen.getByText('AGRICULTURE')).toBeInTheDocument();
    expect(screen.getByText('CLIMATE')).toBeInTheDocument();
    expect(screen.getByText('EDUCATION')).toBeInTheDocument();
    expect(screen.getByText('LEGAL')).toBeInTheDocument();
    expect(screen.getByText('FINANCE')).toBeInTheDocument();
    expect(screen.getByText('TECHNOLOGY')).toBeInTheDocument();
    expect(screen.getByText('SCIENCE')).toBeInTheDocument();
    expect(screen.getByText('SOCIAL SERVICES')).toBeInTheDocument();
    expect(screen.getByText('TRANSPORTATION')).toBeInTheDocument();
    expect(screen.getByText('ENERGY')).toBeInTheDocument();
  });

  it('links sectors to models page with sector query param', () => {
    render(<SectorsSection />);

    const healthcareLink = screen.getByText('HEALTHCARE').closest('a');
    expect(healthcareLink).toHaveAttribute('href', '/models?sector=healthcare');
  });
});
