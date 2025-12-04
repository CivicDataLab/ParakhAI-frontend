'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useDashboardStore } from '@/config/store';
import { jwtDecode } from 'jwt-decode';

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
};

/**
 * useAppSession
 *
 * Combines:
 * - Basic identity from NextAuth / Keycloak (`useSession`)
 * - Rich profile from the dashboard store (typically filled via a GraphQL `me` query)
 *
 * This gives you a single place to read user/session information without
 * having to remember where each piece comes from.
 */
export function useAppSession(): AppSession {
  const { data: session, status } = useSession();
  const { userDetails } = useDashboardStore();

  const me: MeFromBackend | undefined = userDetails?.me;

  // Get tokens from session
  const accessToken = (session as any)?.access_token ?? null;
  const idToken = (session as any)?.id_token ?? null;
  const roles = ((session as any)?.roles as string[]) ?? [];
  
  // Try to decode the access token to get email/name if session doesn't have it
  const decodedData = React.useMemo(() => {
    if (!accessToken) return { email: null, name: null };
    
    try {
      const decoded = jwtDecode(accessToken) as any;
      return {
        email: decoded?.email || null,
        name: decoded?.name || decoded?.preferred_username || null,
      };
    } catch (error) {
      console.warn('Failed to decode access token:', error);
      return { email: null, name: null };
    }
  }, [accessToken]);
  
  const decodedEmail = decodedData.email;
  const decodedName = decodedData.name;

  const nameFromMe =
    me?.firstName || me?.lastName
      ? [me?.firstName, me?.lastName].filter(Boolean).join(' ')
      : null;

  // Priority: Backend me > Decoded token > Session user
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

  // Debug logging - remove in production
  React.useEffect(() => {
    console.group('🔐 Session Debug');
    console.log('Status:', status);
    console.log('Access Token:', accessToken ? `${accessToken.substring(0, 30)}...` : '❌ Missing');
    console.log('ID Token:', idToken ? `${idToken.substring(0, 30)}...` : '❌ Missing');
    console.log('Roles:', roles.length > 0 ? roles : '❌ No roles');
    
    // Decode token to show what's inside
    if (accessToken) {
      try {
        const decoded = jwtDecode(accessToken) as any;
        console.log('📄 Decoded Access Token:', {
          email: decoded?.email || '❌ No email in token',
          name: decoded?.name || decoded?.preferred_username || '❌ No name in token',
          sub: decoded?.sub || '❌ No sub in token',
          realm_access: decoded?.realm_access || '❌ No realm_access',
          exp: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : '❌ No exp',
        });
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
    
    console.log('👤 User Details (Final):', {
      id: user?.id || '❌ Missing',
      name: user?.name || '❌ Missing',
      email: user?.email || '❌ Missing',
      username: user?.username || '❌ Missing',
      roles: user?.roles || [],
      emailSource: user?.email ? 
        (me?.email ? 'Backend (me)' : decodedEmail ? 'Decoded Token' : 'Session') : 
        'None',
    });
    
    console.log('📋 Raw Session Object:', {
      hasAccessToken: !!(session as any)?.access_token,
      hasIdToken: !!(session as any)?.id_token,
      sessionUserEmail: session?.user?.email,
      sessionUserName: session?.user?.name,
      sessionRoles: (session as any)?.roles,
    });
    
    console.log('💾 Backend User Details (me):', me || '❌ Not fetched yet');
    console.groupEnd();
  }, [status, accessToken, idToken, roles, user, session, me, decodedEmail, decodedName]);

  return {
    status,
    accessToken,
    idToken,
    roles,
    user,
  };
}


