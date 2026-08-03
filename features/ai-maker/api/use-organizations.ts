'use client';

import { useQuery } from '@tanstack/react-query';
import { useGraphQL } from '@/lib/graphql-client';
import { GET_MY_ORGANIZATIONS, GET_ORG_DETAILS } from './queries';

export type Organization = {
  id: string;
  name: string;
  slug?: string | null;
  description: string;
  logoUrl?: string;
};

export function useMyOrganizations() {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['myOrganizations'],
    queryFn: async () => {
      const response = await request(GET_MY_ORGANIZATIONS);
      return (response?.myOrganizations ?? []) as Organization[];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrganizationDetails(orgId: string) {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      const response = await request(GET_ORG_DETAILS, { orgId }, { organization: orgId });
      return response?.organization ?? null;
    },
    enabled: isAuthenticated && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
