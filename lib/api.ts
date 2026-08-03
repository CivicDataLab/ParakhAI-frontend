'use client';

import { GraphQLClient } from 'graphql-request';
import React from 'react';
import { getFreshToken } from './api-client';
import { logout } from './auth-helpers';
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
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  if (!backendUrl) {
    throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured. Please set it in your .env.local file.');
  }
  
  let url = backendUrl.trim();
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  
  return url;
}

// ---------------------------------------------------------------------------
// Singleton GraphQL client
// The client itself is stateless – auth is injected per-request via
// requestMiddleware, so there is no reason to recreate it on every call.
// ---------------------------------------------------------------------------
let _graphqlClient: GraphQLClient | null = null;

/**
 * createGraphQLClient
 *
 * Returns a singleton GraphQL client. The requestMiddleware fetches a fresh
 * (cached) token before every request so the client never needs to be
 * recreated when the access token changes.
 *
 * additionalHeaders (e.g. `organization`) are merged in on each call via a
 * fresh GraphQLClient wrapper that delegates to the singleton's middleware.
 */
export function createGraphQLClient(
  _accessToken: string | null,
  additionalHeaders: Record<string, string> = {}
): GraphQLClient {
  const endpoint = getGraphQLEndpoint();
  const hasExtra = Object.keys(additionalHeaders).length > 0;

  // Return the singleton when no extra headers are needed
  if (!hasExtra) {
    if (!_graphqlClient) {
      _graphqlClient = buildClient(endpoint, {});
    }
    return _graphqlClient;
  }

  // For requests with per-call headers (e.g. `organization`) create a
  // short-lived client – still cheap because it reuses the same middleware.
  return buildClient(endpoint, additionalHeaders);
}

function buildClient(
  endpoint: string,
  additionalHeaders: Record<string, string>
): GraphQLClient {
  return new GraphQLClient(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    },
    // requestMiddleware runs before every request – correct interception point
    // for graphql-request v5 (the 'fetch' option is not in PatchedRequestInit).
    requestMiddleware: async (request) => {
      const token = await getFreshToken();
      if (!token) return request; // getFreshToken already triggered logout
      return {
        ...request,
        headers: { ...request.headers, Authorization: `Bearer ${token}` },
      };
    },
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
  const { status, error: sessionError } = useAppSession();
  const hasLoggedOut = React.useRef(false);

  // Handle top-level session errors (refresh token expired, etc.)
  React.useEffect(() => {
    if (hasLoggedOut.current) return;

    if (sessionError === 'RefreshAccessTokenError' || sessionError === 'RefreshTokenExpired') {
      hasLoggedOut.current = true;
      console.warn('🔒 useGraphQL: Session error detected, logging out:', sessionError);
      logout('/');
    }
  }, [sessionError]);

  // `request` does not depend on `accessToken` – the requestMiddleware in
  // createGraphQLClient fetches the token on-demand before each request.
  // Only `status` is needed so we can gate unauthenticated/loading states.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = React.useCallback(async <T = any>(
    query: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        logout('/');
      }
      throw new Error('User is not authenticated. Please log in.');
    }

    try {
      // Pass null for accessToken – the middleware owns auth
      const result = await graphqlRequest<T>(query, variables, null, headers);
      return result;
    } catch (error) {
      if (isAuthenticationError(error) && !hasLoggedOut.current) {
        hasLoggedOut.current = true;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.warn('🔒 useGraphQL: Auth error from backend, logging out:', msg);
        logout('/');
        throw new Error('Session expired. Please log in again.');
      }

      const err = error as { message?: string } | null;
      const errorMessage = err?.message || 'Unknown error';
      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('CORS')
      ) {
        throw new Error(
          'Backend server is not available. Please check if the GraphQL server is running and accessible.'
        );
      }
      throw error;
    }
  }, [status]); // ← `accessToken` removed: middleware fetches it on-demand

  return {
    request,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
  };
}

/**
 * Legacy function for backward compatibility
 * 
 * @deprecated Use useGraphQL() hook instead for better React integration.
 * This function cannot access session tokens automatically.
 * Pass accessToken explicitly if needed, or use useGraphQL() in React components.
 */
export async function GraphQL<T = any>(
  query: string,
  variables: Record<string, any> = {},
  accessToken: string | null = null
): Promise<T> {
  return graphqlRequest<T>(query, variables, accessToken);
}

