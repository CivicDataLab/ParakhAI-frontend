'use client';

import { GraphQLClient } from 'graphql-request';
import React from 'react';
import { getFreshToken } from './rest-client';
import { logout } from './auth';
import { useAppSession } from '@/hooks/use-app-session';

export function getGraphQLEndpoint(): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    throw new Error(
      'NEXT_PUBLIC_BACKEND_URL is not configured. Please set it in your .env.local file.'
    );
  }

  let url = backendUrl.trim();

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  return url;
}

let _graphqlClient: GraphQLClient | null = null;

export function createGraphQLClient(
  _accessToken: string | null,
  additionalHeaders: Record<string, string> = {}
): GraphQLClient {
  const endpoint = getGraphQLEndpoint();
  const hasExtra = Object.keys(additionalHeaders).length > 0;

  if (!hasExtra) {
    if (!_graphqlClient) {
      _graphqlClient = buildClient(endpoint, {});
    }
    return _graphqlClient;
  }

  return buildClient(endpoint, additionalHeaders);
}

function buildClient(endpoint: string, additionalHeaders: Record<string, string>): GraphQLClient {
  return new GraphQLClient(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    },
    requestMiddleware: async (request) => {
      const token = await getFreshToken();
      if (!token) return request;
      return {
        ...request,
        headers: { ...request.headers, Authorization: `Bearer ${token}` },
      };
    },
  });
}

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
    const endpoint = getGraphQLEndpoint();
    console.error('GraphQL request failed:', {
      endpoint,
      error: error?.message,
      response: error?.response,
      data: error?.response?.data,
      errors: error?.response?.errors,
    });

    if (error?.response?.errors) {
      const graphqlErrors = error.response.errors.map((e: any) => e.message).join('; ');
      const enhancedError = new Error(`GraphQL Error: ${graphqlErrors}`);
      (enhancedError as any).response = error.response;
      throw enhancedError;
    }

    throw error;
  }
}

function isAuthenticationError(error: any): boolean {
  const errorMessage = (error?.message || '').toLowerCase();
  const responseErrors = error?.response?.errors || [];

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

  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return true;
  }

  return false;
}

export function useGraphQL() {
  const { status, error: sessionError } = useAppSession();
  const hasLoggedOut = React.useRef(false);

  React.useEffect(() => {
    if (hasLoggedOut.current) return;

    if (sessionError === 'RefreshAccessTokenError' || sessionError === 'RefreshTokenExpired') {
      hasLoggedOut.current = true;
      console.warn('🔒 useGraphQL: Session error detected, logging out:', sessionError);
      logout('/');
    }
  }, [sessionError]);

  const request = React.useCallback(
    async <T = any>(
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
          logout('/');
        }
        throw new Error('User is not authenticated. Please log in.');
      }

      try {
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
    },
    [status]
  );

  return {
    request,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
  };
}

/** @deprecated Use useGraphQL() hook instead. */
export async function GraphQL<T = any>(
  query: string,
  variables: Record<string, any> = {},
  accessToken: string | null = null
): Promise<T> {
  return graphqlRequest<T>(query, variables, accessToken);
}
