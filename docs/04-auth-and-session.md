# Authentication and Session Flow

## Auth stack overview

The project uses **NextAuth** with **Keycloak** as the identity provider.

Key auth files:

- `app/api/auth/[...nextauth]/options.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/auth/logout/route.ts`
- `components/SessionGuard.tsx`
- `lib/session.ts`
- `lib/auth-helpers.ts`
- `middleware.ts`

## Token lifecycle

In `authOptions` (`options.ts`):

1. On first login, access/id/refresh tokens are stored in JWT callback.
2. Access token expiry is checked on each JWT callback invocation.
3. If access token is near expiry, refresh token flow is executed against Keycloak token endpoint.
4. Session callback maps token values (`access_token`, `id_token`, `roles`, `error`) into session.

If refresh fails, session carries error states such as:

- `RefreshAccessTokenError`
- `RefreshTokenExpired`

## Client-side session composition

`useAppSession` in `lib/session.ts` merges:

- NextAuth session data
- decoded access token claims
- richer profile data from dashboard store (`userDetails.me`)

This provides a single interface for user + token info inside UI code.

## Route protection strategy

- Middleware protects non-public pages at routing level.
- `DashboardGuard` wraps dashboard UI and delegates to `SessionGuard`.
- `SessionGuard` performs runtime checks:
  - authenticated status
  - session error states
  - token expiry checks
  - lightweight backend validation query

If validation fails, user is logged out and redirected.

## Logout flow

- Client calls `/api/auth/logout`
- Route builds Keycloak end-session URL with `id_token_hint` and redirect URI
- Client then calls `next-auth` signOut and redirects to Keycloak logout URL

## Common auth debugging tips

- Verify `AUTH_ISSUER`, client credentials, and `NEXTAUTH_URL`.
- Check browser network for refresh token calls and GraphQL 401/403 responses.
- Inspect session error values exposed by `useAppSession`.
- Confirm protected route behavior in middleware for locale-prefixed URLs.
