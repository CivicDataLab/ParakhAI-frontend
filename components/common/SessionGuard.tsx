'use client';

import { logout } from '@/lib/auth';
import { useAppSession } from '@/hooks/use-app-session';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useRef } from 'react';

interface SessionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * SessionGuard Component
 * 
 * Simplified SessionGuard:
 * 1. Checks initial loading status.
 * 2. Checks if user is authenticated or has a session error.
 * 3. Logs out if unauthenticated or on error (exactly once via a ref).
 * 4. Renders children immediately once authenticated with no error.
 */
export function SessionGuard({ children, fallback }: SessionGuardProps) {
  const { data: session, status } = useSession();
  const { error: appSessionError } = useAppSession();
  const hasLoggedOut = useRef(false);

  // Logout handler - ensures we only logout once
  const handleLogout = useCallback(async (reason: string) => {
    if (hasLoggedOut.current) return;
    hasLoggedOut.current = true;
    
    console.warn(`🔒 SessionGuard: Logging out - ${reason}`);
    await logout('/');
  }, []);

  const sessionError = (session as { error?: string })?.error;
  const hasError = 
    sessionError === 'RefreshAccessTokenError' ||
    sessionError === 'RefreshTokenExpired' ||
    appSessionError === 'RefreshAccessTokenError' ||
    appSessionError === 'RefreshTokenExpired';

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      handleLogout('User is not authenticated');
      return;
    }

    if (hasError) {
      handleLogout(`Session error: ${sessionError || appSessionError}`);
    }
  }, [status, hasError, sessionError, appSessionError, handleLogout]);

  // Show loading state
  if (status === 'loading') {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  // Not valid - will be redirected
  if (status === 'unauthenticated' || hasError) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to handle authentication errors from API calls
 * Use this in components that make API calls to handle auth failures
 */
export function useAuthErrorHandler() {
  const hasLoggedOut = useRef(false);

  const handleAuthError = useCallback(async (error: unknown) => {
    if (hasLoggedOut.current) return;

    const err = error as { message?: string; response?: { status?: number } } | null;
    const errorMessage = err?.message?.toLowerCase() || '';
    const isAuthError = 
      errorMessage.includes('authentication') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('token') ||
      errorMessage.includes('not authenticated') ||
      err?.response?.status === 401 ||
      err?.response?.status === 403;

    if (isAuthError) {
      hasLoggedOut.current = true;
      console.warn('🔒 Auth error detected, logging out:', err?.message);
      await logout('/');
    }
  }, []);

  return { handleAuthError };
}

export default SessionGuard;
