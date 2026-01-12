'use client';

import { signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';

/**
 * Hook to handle session errors (e.g., token refresh failures).
 * Automatically signs out the user when the session has an error,
 * forcing them to re-authenticate with Keycloak.
 */
export function useSessionError() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError' || session?.error === 'RefreshTokenExpired') {
      console.warn('🔒 Session error detected, signing out:', session.error);
      signOut({ callbackUrl: '/login' });
    }
  }, [session?.error]);

  return session?.error;
}
