'use client';

import { GraphQLClient } from 'graphql-request';
import { useAppSession } from './session';

/**
 * GraphQL API Client Utility
 * 
 * Provides authenticated GraphQL requests with automatic token injection.
 * Use this instead of raw fetch() calls to ensure all requests include authentication.
 */

/**
 * Get the GraphQL endpoint URL from environment variables
 */
export function getGraphQLEndpoint(): string {
  const endpoint = process.env.NEXT_PUBLIC_USI_GRAPHQL_ENDPOINT;
  if (!endpoint) {
    throw new Error('NEXT_PUBLIC_USI_GRAPHQL_ENDPOINT is not configured');
  }
  return endpoint;
}

/**
 * Create an authenticated GraphQL client with access token
 * 
 * @param accessToken - The Keycloak access token (from useAppSession)
 * @returns Configured GraphQLClient instance
 */
export function createGraphQLClient(accessToken: string | null): GraphQLClient {
  const endpoint = getGraphQLEndpoint();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add Authorization header if access token is available
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
    // Debug logging - remove in production
    console.log('🔑 Sending Access Token to Backend:', {
      endpoint,
      tokenPreview: `${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}`,
      tokenLength: accessToken.length,
      hasAuthHeader: !!headers['Authorization'],
    });
  } else {
    console.warn('⚠️ No Access Token Available - Request will be unauthenticated');
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
  accessToken: string | null = null
): Promise<T> {
  const client = createGraphQLClient(accessToken);
  return client.request<T>(query, variables);
}

/**
 * React hook for making authenticated GraphQL requests
 * 
 * Automatically uses the current user's access token from the session.
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
  const { accessToken, status } = useAppSession();

  const request = async <T = any>(
    query: string,
    variables: Record<string, any> = {}
  ): Promise<T> => {
    if (status === 'loading') {
      throw new Error('Session is still loading. Please wait.');
    }

    if (status === 'unauthenticated') {
      throw new Error('User is not authenticated. Please log in.');
    }

    // Debug logging - remove in production
    console.log('📡 Making GraphQL Request:', {
      queryName: query.split('query')[1]?.split('(')[0]?.trim() || query.split('mutation')[1]?.split('(')[0]?.trim() || 'Unknown',
      variables,
      hasAccessToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : '❌ Missing',
    });

    try {
      const result = await graphqlRequest<T>(query, variables, accessToken);
      console.log('✅ GraphQL Request Success:', result);
      return result;
    } catch (error) {
      console.error('❌ GraphQL Request Failed:', error);
      throw error;
    }
  };

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

