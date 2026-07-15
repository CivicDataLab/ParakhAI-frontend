import { describe, expect, it } from 'vitest';
import {
  OrganizationContext,
  useOrganization,
} from '@/features/ai-maker/context/OrganizationContext';
import { render, screen } from '@/testing/utils';

function OrganizationConsumer() {
  const { organization, isLoading } = useOrganization();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="org-name">{organization?.name ?? 'none'}</span>
    </div>
  );
}

describe('OrganizationContext', () => {
  it('provides default context values', () => {
    render(<OrganizationConsumer />);

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('org-name')).toHaveTextContent('none');
  });

  it('returns organization values from provider', () => {
    render(
      <OrganizationContext.Provider
        value={{
          organization: { name: 'CivicDataLab', logoUrl: '/logo.png', slug: 'cdl' },
          isLoading: false,
        }}
      >
        <OrganizationConsumer />
      </OrganizationContext.Provider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('org-name')).toHaveTextContent('CivicDataLab');
  });
});
