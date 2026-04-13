# GraphQL and Data Flow

## GraphQL client entrypoint

Primary data-access helpers are in `lib/api.ts`:

- `getGraphQLEndpoint()` - resolves endpoint from `NEXT_PUBLIC_BACKEND_URL`
- `createGraphQLClient()` - creates `graphql-request` client with auth headers
- `graphqlRequest()` - convenience request function with improved error reporting
- `useGraphQL()` - preferred React hook for authenticated requests

## How authentication is attached

`useGraphQL()` reads `accessToken` from `useAppSession()` and injects:

```http
Authorization: Bearer <token>
```

It also detects authentication failures and triggers logout when needed.

## Organization-scoped requests

Some routes pass extra headers, for example:

- `organization: <orgId>`

This is used in AI Maker org pages to scope backend responses by organization context.

## Where GraphQL calls live

This codebase currently keeps GraphQL operations close to UI pages/components (inline query strings).  
Examples include:

- AI Maker dashboard pages for models/evaluations/metrics
- Auditor dashboard assignment queries and mutations

## State update pattern

Typical flow in a dashboard page:

1. Page mounts and reads params (`locale`, `orgId`, etc.)
2. `useGraphQL().request()` fetches one or more queries
3. Local component state stores result for table/cards
4. Optional shared state is written to Zustand store (`config/store.tsx`)

## Error handling patterns

- API utility logs endpoint + GraphQL error details for debugging
- Session-related errors trigger guarded logout flows
- Components usually keep local `loading`, `error`, and retry UI states

## Guidance for new feature development

- Prefer using `useGraphQL()` in React components.
- Keep queries/mutations near their route/component unless moving to a shared data layer is clearly needed.
- Include org scoping headers for organization-specific resources.
- Reuse session/error handling patterns from existing pages to keep behavior consistent.
