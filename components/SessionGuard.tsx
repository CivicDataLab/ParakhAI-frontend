'use client';

import { useAppSession } from '@/lib/session';
import { signOut, useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface SessionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * SessionGuard Component
 * 
 * Provides tight integration with Keycloak session management:
 * 1. Validates that user has an active session
 * 2. Checks for session errors (RefreshAccessTokenError, RefreshTokenExpired)
 * 3. Validates token expiry client-side
 * 4. Provides a mechanism to validate token with backend
 * 5. Auto-logs out user when Keycloak session is invalid
 * 
 * Wrap protected pages/layouts with this component to ensure
 * only authenticated users with valid Keycloak sessions can access them.
 */
export function SessionGuard({ children, fallback }: SessionGuardProps) {
  const { data: session, status, update } = useSession();
  const { accessToken, error: appSessionError } = useAppSession();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const hasLoggedOut = useRef(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Logout handler - ensures we only logout once
  const handleLogout = useCallback(async (reason: string) => {
    if (hasLoggedOut.current) return;
    hasLoggedOut.current = true;
    
    console.warn(`🔒 SessionGuard: Logging out - ${reason}`);
    
    // Clear any pending validation
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    await signOut({ 
      callbackUrl: '/',
      redirect: true 
    });
  }, []);

  // Check if token is expired client-side
  const isTokenExpired = useCallback((token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (!exp) return false;
      
      // Add 30 second buffer
      const now = Math.floor(Date.now() / 1000);
      return now >= (exp - 30);
    } catch {
      return true; // If we can't parse, assume expired
    }
  }, []);

  // Validate session with backend
  const validateWithBackend = useCallback(async (token: string): Promise<boolean> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        console.warn('SessionGuard: NEXT_PUBLIC_BACKEND_URL not configured, skipping backend validation');
        return true; // Skip backend validation if not configured
      }

      // Make a lightweight GraphQL query to validate the token
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `query ValidateSession { __typename }`,
        }),
      });

      if (!response.ok) {
        // 401 or 403 means token is invalid
        if (response.status === 401 || response.status === 403) {
          return false;
        }
      }

      const data = await response.json();
      
      // Check for authentication errors in GraphQL response
      if (data.errors) {
        const authErrors = data.errors.filter((e: any) => 
          e.message?.toLowerCase().includes('authentication') ||
          e.message?.toLowerCase().includes('unauthorized') ||
          e.message?.toLowerCase().includes('token') ||
          e.extensions?.code === 'UNAUTHENTICATED'
        );
        if (authErrors.length > 0) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('SessionGuard: Backend validation error:', error);
      // On network errors, don't logout - might be temporary
      return true;
    }
  }, []);

  // Main validation effect
  useEffect(() => {
    const validateSession = async () => {
      // Reset logout flag on new validation cycle
      if (status === 'loading') {
        setIsValidating(true);
        return;
      }

      // Not authenticated - redirect to login
      if (status === 'unauthenticated') {
        setIsValidating(false);
        setIsValid(false);
        handleLogout('User is not authenticated');
        return;
      }

      // Check for session errors from NextAuth
      const sessionError = (session as any)?.error;
      if (sessionError === 'RefreshAccessTokenError' || sessionError === 'RefreshTokenExpired') {
        setIsValidating(false);
        setIsValid(false);
        handleLogout(`Session error: ${sessionError}`);
        return;
      }

      // Check for app session errors
      if (appSessionError === 'RefreshAccessTokenError' || appSessionError === 'RefreshTokenExpired') {
        setIsValidating(false);
        setIsValid(false);
        handleLogout(`App session error: ${appSessionError}`);
        return;
      }

      // No access token
      if (!accessToken) {
        setIsValidating(false);
        setIsValid(false);
        handleLogout('No access token available');
        return;
      }

      // Check token expiry client-side
      if (isTokenExpired(accessToken)) {
        console.log('SessionGuard: Token appears expired, attempting refresh...');
        // Try to refresh the session
        const updatedSession = await update();
        if (!updatedSession || (updatedSession as any)?.error) {
          setIsValidating(false);
          setIsValid(false);
          handleLogout('Token expired and refresh failed');
          return;
        }
      }

      // Validate with backend (debounced)
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }

      validationTimeoutRef.current = setTimeout(async () => {
        const backendValid = await validateWithBackend(accessToken);
        if (!backendValid) {
          setIsValidating(false);
          setIsValid(false);
          handleLogout('Backend token validation failed');
          return;
        }

        // All checks passed
        setIsValidating(false);
        setIsValid(true);
        hasLoggedOut.current = false; // Reset for future validations
      }, 100);
    };

    validateSession();

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [status, session, accessToken, appSessionError, isTokenExpired, validateWithBackend, handleLogout, update]);

  // Periodic validation (every 2 minutes)
  useEffect(() => {
    if (!isValid || !accessToken) return;

    const interval = setInterval(async () => {
      // Check token expiry
      if (isTokenExpired(accessToken)) {
        const updatedSession = await update();
        if (!updatedSession || (updatedSession as any)?.error) {
          handleLogout('Periodic check: Token expired and refresh failed');
        }
      }
    }, 2 * 60 * 1000); // Every 2 minutes

    return () => clearInterval(interval);
  }, [isValid, accessToken, isTokenExpired, update, handleLogout]);

  // Show loading state
  if (isValidating || status === 'loading') {
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
  if (!isValid) {
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

  const handleAuthError = useCallback(async (error: any) => {
    if (hasLoggedOut.current) return;

    const errorMessage = error?.message?.toLowerCase() || '';
    const isAuthError = 
      errorMessage.includes('authentication') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('token') ||
      errorMessage.includes('not authenticated') ||
      error?.response?.status === 401 ||
      error?.response?.status === 403;

    if (isAuthError) {
      hasLoggedOut.current = true;
      console.warn('🔒 Auth error detected, logging out:', error?.message);
      await signOut({ callbackUrl: '/', redirect: true });
    }
  }, []);

  return { handleAuthError };
}

export default SessionGuard;
