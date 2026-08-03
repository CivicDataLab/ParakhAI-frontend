import { describe, expect, it, vi } from 'vitest';
import TrendingSection from '@/features/home/components/TrendingSection';
import { render, screen } from '@/testing/utils';

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

describe('TrendingSection', () => {
  it('renders multilingual heading text', () => {
    render(<TrendingSection />);

    expect(screen.getByText(/Improving AI across English, हिन्दी, ଓଡ଼ିଆ,/i)).toBeInTheDocument();
    expect(screen.getByText(/অসমীয়া and more/i)).toBeInTheDocument();
  });
});
