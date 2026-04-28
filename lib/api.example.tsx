/**
 * EXAMPLE: How to use the GraphQL API utility with authentication
 * 
 * This file shows different ways to pass user details and access_token to backend.
 * Delete this file after you've integrated it into your components.
 */

import { useEffect } from 'react';
import { useGraphQL, graphqlRequest } from './api';
import { useAppSession } from './session';

// ============================================================================
// METHOD 1: Using the useGraphQL() hook (RECOMMENDED for React components)
// ============================================================================

export function ExampleComponentWithHook() {
  const { request, isAuthenticated } = useGraphQL();

  // Example query
  const MY_QUERY = `
    query GetUserData($userId: ID!) {
      user(id: $userId) {
        id
        name
        email
      }
    }
  `;

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        // Access token is automatically included in headers
        const data = await request(MY_QUERY, { userId: '123' });
        console.log('User data:', data);
      } catch (error) {
        console.error('API error:', error);
      }
    };

    fetchData();
  }, [request, isAuthenticated]);

  return <div>Component content</div>;
}

// ============================================================================
// METHOD 2: Using useAppSession() + graphqlRequest() directly
// ============================================================================

export function ExampleComponentWithDirectCall() {
  const { accessToken, user, status } = useAppSession();

  const MY_MUTATION = `
    mutation CreateAudit($input: AuditInput!) {
      createAudit(input: $input) {
        id
        name
      }
    }
  `;

  const handleSubmit = async () => {
    if (status !== 'authenticated' || !accessToken) {
      alert('Please log in first');
      return;
    }

    try {
      // Pass access token explicitly
      const result = await graphqlRequest(
        MY_MUTATION,
        {
          input: {
            name: 'My Audit',
            userId: user?.id, // You can also pass user details in variables
            userEmail: user?.email,
          },
        },
        accessToken // Access token goes here
      );

      console.log('Audit created:', result);
    } catch (error) {
      console.error('Failed to create audit:', error);
    }
  };

  return <button onClick={handleSubmit}>Create Audit</button>;
}

// ============================================================================
// METHOD 3: Passing user details in GraphQL variables (if backend needs it)
// ============================================================================

export function ExampleWithUserDetailsInVariables() {
  const { request } = useGraphQL();
  const { user } = useAppSession();

  const CREATE_AUDIT_MUTATION = `
    mutation CreateAudit($input: AuditInput!, $userContext: UserContext) {
      createAudit(input: $input, userContext: $userContext) {
        id
        createdBy {
          id
          email
          name
        }
      }
    }
  `;

  const handleCreate = async () => {
    try {
      const result = await request(CREATE_AUDIT_MUTATION, {
        input: {
          name: 'My Audit',
          // ... other audit fields
        },
        // Pass user details as a separate variable if backend expects it
        userContext: {
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name,
          userRoles: user?.roles,
        },
      });

      console.log('Created:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return <button onClick={handleCreate}>Create</button>;
}

// ============================================================================
// HOW IT WORKS:
// ============================================================================
//
// 1. Access Token (automatic):
//    - The useGraphQL() hook automatically gets accessToken from useAppSession()
//    - It adds "Authorization: Bearer <token>" header to every request
//    - Backend can verify the token and extract user info from it
//
// 2. User Details (optional):
//    - You can pass user.id, user.email, etc. in GraphQL variables if needed
//    - But usually backend extracts this from the JWT token itself
//    - Only pass user details in variables if backend specifically requires it
//
// 3. Backend receives:
//    - Headers: { "Authorization": "Bearer <access_token>" }
//    - Body: { query: "...", variables: { ... } }
//    - Backend decodes the JWT token to get user info
//
// ============================================================================

