'use client';

import { GraphQLClient } from 'graphql-request';
import { signOut } from 'next-auth/react';
import React from 'react';
import { useAppSession } from './session';

/**
 * GraphQL API Client Utility
 * 
 * Provides authenticated GraphQL requests with automatic token injection.
 * Use this instead of raw fetch() calls to ensure all requests include authentication.
 */

/**
 * Get the GraphQL endpoint URL
 * Calls the backend directly using NEXT_PUBLIC_BACKEND_URL
 * Note: This requires the backend to have CORS properly configured
 */
export function getGraphQLEndpoint(): string {
  // Use proxy in development, direct URL in production
  // if (process.env.NODE_ENV === 'development') {
  //   return '/api/graphql';
  // }
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  if (!backendUrl) {
    throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured. Please set it in your .env.local file.');
  }
  
  let url = backendUrl.trim();
  
  // Ensure URL has a protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  
  return url;
}

/**
 * Create an authenticated GraphQL client with access token
 * 
 * @param accessToken - The Keycloak access token (from useAppSession)
 * @returns Configured GraphQLClient instance
 */
export function createGraphQLClient(
  accessToken: string | null,
  additionalHeaders: Record<string, string> = {}
): GraphQLClient {
  const endpoint = getGraphQLEndpoint();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  // Add Authorization header if access token is available
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return new GraphQLClient(endpoint, {
    headers,
  });
}

/**
 * Make an authenticated GraphQL request
 * 
 * This is a convenience function that creates a client and executes a query/mutation.
 * For better performance in React components, use the hook version instead.
 * 
 * @param query - GraphQL query/mutation string
 * @param variables - Variables for the query
 * @param accessToken - Access token from useAppSession
 * @returns Promise with the response data
 */
export async function graphqlRequest<T = any>(
  query: string,
  variables: Record<string, any> = {},
  accessToken: string | null = null,
  additionalHeaders: Record<string, string> = {}
): Promise<T> {
  const client = createGraphQLClient(accessToken, additionalHeaders);

  try {
    return await client.request<T>(query, variables);
  } catch (error: any) {
    // Log the actual endpoint being used for debugging
    const endpoint = getGraphQLEndpoint();
    console.error('GraphQL request failed:', {
      endpoint,
      error: error?.message,
      response: error?.response,
      data: error?.response?.data,
      errors: error?.response?.errors,
    });
    
    // If there are GraphQL errors in the response, include them
    if (error?.response?.errors) {
      const graphqlErrors = error.response.errors.map((e: any) => e.message).join('; ');
      const enhancedError = new Error(`GraphQL Error: ${graphqlErrors}`);
      (enhancedError as any).response = error.response;
      throw enhancedError;
    }
    
    throw error;
  }
}

/**
 * Check if an error is an authentication error that should trigger logout
 */
function isAuthenticationError(error: any): boolean {
  const errorMessage = (error?.message || '').toLowerCase();
  const responseErrors = error?.response?.errors || [];
  
  // Check error message
  if (
    errorMessage.includes('authentication') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('not authenticated') ||
    errorMessage.includes('invalid token') ||
    errorMessage.includes('token expired') ||
    errorMessage.includes('token has expired')
  ) {
    return true;
  }
  
  // Check GraphQL errors
  for (const gqlError of responseErrors) {
    const msg = (gqlError?.message || '').toLowerCase();
    if (
      msg.includes('authentication') ||
      msg.includes('unauthorized') ||
      msg.includes('not authenticated') ||
      msg.includes('invalid token') ||
      msg.includes('token expired') ||
      gqlError?.extensions?.code === 'UNAUTHENTICATED'
    ) {
      return true;
    }
  }
  
  // Check HTTP status
  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return true;
  }
  
  return false;
}

/**
 * React hook for making authenticated GraphQL requests
 * 
 * Automatically uses the current user's access token from the session.
 * Handles authentication errors by logging out the user.
 * 
 * @example
 * ```tsx
 * const { request } = useGraphQL();
 * 
 * useEffect(() => {
 *   const fetchData = async () => {
 *     const data = await request(MY_QUERY, { id: '123' });
 *     console.log(data);
 *   };
 *   fetchData();
 * }, [request]);
 * ```
 */
export function useGraphQL() {
  const { accessToken, status, error: sessionError } = useAppSession();
  const hasLoggedOut = React.useRef(false);

  // Handle session errors
  React.useEffect(() => {
    if (hasLoggedOut.current) return;
    
    if (sessionError === 'RefreshAccessTokenError' || sessionError === 'RefreshTokenExpired') {
      hasLoggedOut.current = true;
      console.warn('🔒 useGraphQL: Session error detected, logging out:', sessionError);
      signOut({ callbackUrl: '/', redirect: true });
    }
  }, [sessionError]);

  // Memoize request function to prevent unnecessary re-renders
  const request = React.useCallback(async <T = any>(
    query: string,
    variables: Record<string, any> = {},
    headers: Record<string, string> = {}
  ): Promise<T> => {
    if (status === 'loading') {
      throw new Error('Session is still loading. Please wait.');
    }

    if (status === 'unauthenticated') {
      if (!hasLoggedOut.current) {
        hasLoggedOut.current = true;
        console.warn('🔒 useGraphQL: User not authenticated, redirecting to login');
        signOut({ callbackUrl: '/', redirect: true });
      }
      throw new Error('User is not authenticated. Please log in.');
    }

    try {
      const result = await graphqlRequest<T>(query, variables, accessToken, headers);
      return result;
    } catch (error: any) {
      // Check for authentication errors and logout if needed
      if (isAuthenticationError(error) && !hasLoggedOut.current) {
        hasLoggedOut.current = true;
        console.warn('🔒 useGraphQL: Authentication error from backend, logging out:', error?.message);
        signOut({ callbackUrl: '/', redirect: true });
        throw new Error('Session expired. Please log in again.');
      }
      
      // More specific error handling
      const errorMessage = error?.message || 'Unknown error';
      // Check for CORS errors (shouldn't happen with proxy, but just in case)
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('NetworkError') || errorMessage.includes('CORS')) {
        throw new Error('Backend server is not available. Please check if the GraphQL server is running and accessible.');
      }
      throw error;
    }
  }, [accessToken, status]); // Only recreate when accessToken or status changes

  return {
    request,
    accessToken,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
  };
}

/**
 * Legacy function for backward compatibility
 * 
 * This matches the pattern mentioned in your project docs.
 * Automatically attaches Authorization header using session token.
 * 
 * @deprecated Use useGraphQL() hook instead for better React integration
 */
export async function GraphQL<T = any>(
  query: string,
  variables: Record<string, any> = {},
  deps: any[] = []
): Promise<T> {
  // Note: This function cannot access React hooks, so it requires
  // the access token to be passed explicitly or retrieved from a global store.
  // For client-side usage, prefer useGraphQL() hook.
  
  // Try to get token from window if available (for client-side)
  // In practice, you should use useGraphQL() hook in React components
  const accessToken = typeof window !== 'undefined' 
    ? (window as any).__ACCESS_TOKEN__ || null 
    : null;

  return graphqlRequest<T>(query, variables, accessToken);
}

