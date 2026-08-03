import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import HowItWorksSection from '@/features/home/components/HowItWorksSection';
import { render, screen } from '@/testing/utils';

describe('HowItWorksSection', () => {
  it('renders heading and all tab buttons', () => {
    render(<HowItWorksSection />);

    expect(screen.getByText('ParakhAI helps you catch risks early.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Automation-assisted Evaluation Environment' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expert-led Evaluations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sector-specific Test Cases' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Evaluation History & Reports' })
    ).toBeInTheDocument();
  });

  it('shows default tab content on initial render', () => {
    render(<HowItWorksSection />);

    expect(
      screen.getByText(/Run scalable, guided evaluations in one workspace/i)
    ).toBeInTheDocument();
    expect(screen.getByAltText('Automation-assisted Eval Environment')).toBeInTheDocument();
  });

  it('updates content when a different tab is clicked', async () => {
    const user = userEvent.setup();
    render(<HowItWorksSection />);

    await user.click(screen.getByRole('button', { name: 'Expert-led Evaluations' }));

    expect(
      screen.getByText(/Apply technical, domain, and cultural expertise/i)
    ).toBeInTheDocument();
    expect(screen.getByAltText('Expert-led Evaluations')).toBeInTheDocument();
    expect(
      screen.queryByText(/Run scalable, guided evaluations in one workspace/i)
    ).not.toBeInTheDocument();
  });

  it('shows evaluation history content when that tab is selected', async () => {
    const user = userEvent.setup();
    render(<HowItWorksSection />);

    await user.click(screen.getByRole('button', { name: 'Evaluation History & Reports' }));

    expect(
      screen.getByText(/Track evaluation outcomes over time to support transparency,/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/accountability, and continuous improvement of AI systems./i)
    ).toBeInTheDocument();
    expect(screen.getByAltText('Evaluation History & Reports')).toBeInTheDocument();
  });
});
