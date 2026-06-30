'use client';

import { useDashboardStore } from '@/stores';
import { jwtDecode } from 'jwt-decode';
import { useSession } from 'next-auth/react';
import React from 'react';

type OrgMembership = {
  organization?: {
    id?: string;
    name?: string;
  };
  role?: {
    name?: string;
  };
};

type MeFromBackend = {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  profilePicture?: {
    name?: string;
    path?: string;
    url?: string;
  };
  githubProfile?: string;
  linkedinProfile?: string;
  twitterProfile?: string;
  organizationMemberships?: OrgMembership[];
};

export type AppUser = {
  id: string | null;
  username: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  roles: string[];
  bio?: string | null;
  location?: string | null;
  githubProfile?: string | null;
  linkedinProfile?: string | null;
  twitterProfile?: string | null;
  organizations: Array<{
    id: string | null;
    name: string | null;
    role: string | null;
  }>;
};

export type AppSession = {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  accessToken: string | null;
  idToken: string | null;
  roles: string[];
  user: AppUser | null;
  error?: string;
};

export function useAppSession(): AppSession {
  const { data: session, status } = useSession();
  const { userDetails } = useDashboardStore();

  const me: MeFromBackend | undefined = userDetails?.me;

  const accessToken = (session as any)?.access_token ?? null;
  const idToken = (session as any)?.id_token ?? null;
  const roles = ((session as any)?.roles as string[]) ?? [];

  const decodedData = React.useMemo(() => {
    if (!accessToken) return { email: null, name: null };

    try {
      const decoded = jwtDecode(accessToken) as any;
      return {
        email: decoded?.email || null,
        name: decoded?.name || decoded?.preferred_username || null,
      };
    } catch (error) {
      return { email: null, name: null };
    }
  }, [accessToken]);

  const decodedEmail = decodedData.email;
  const decodedName = decodedData.name;

  const nameFromMe =
    me?.firstName || me?.lastName
      ? [me?.firstName, me?.lastName].filter(Boolean).join(' ')
      : null;

  const user: AppUser | null = session
    ? {
        id: (me?.id ?? null) || null,
        username: me?.username ?? null,
        name: nameFromMe ?? decodedName ?? (session.user?.name ?? null),
        email: me?.email ?? decodedEmail ?? (session.user?.email ?? null),
        image: me?.profilePicture?.url ?? (session.user?.image ?? null),
        roles,
        bio: me?.bio ?? null,
        location: me?.location ?? null,
        githubProfile: me?.githubProfile ?? null,
        linkedinProfile: me?.linkedinProfile ?? null,
        twitterProfile: me?.twitterProfile ?? null,
        organizations:
          me?.organizationMemberships?.map((m) => ({
            id: m.organization?.id ?? null,
            name: m.organization?.name ?? null,
            role: m.role?.name ?? null,
          })) ?? [],
      }
    : null;

  const sessionError = (session as any)?.error;

  return {
    status,
    accessToken,
    idToken,
    roles,
    user,
    error: sessionError,
  };
}
