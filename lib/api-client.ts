import { jwtDecode } from 'jwt-decode';
import { getSession } from 'next-auth/react';
import { logout } from '@/lib/auth-helpers';

// ---------------------------------------------------------------------------
// Module-level token cache
// Avoids calling getSession() (a network round-trip to /api/auth/session) on
// every request when the token is still valid.
// ---------------------------------------------------------------------------
let cachedToken: string | null = null;
let cachedTokenExp: number | null = null;    // unix timestamp from exp claim
let refreshPromise: Promise<string | null> | null = null;

/** Invalidate the in-memory token cache (e.g. after a forced logout). */
function invalidateCache() {
  cachedToken = null;
  cachedTokenExp = null;
}

/**
 * getFreshToken
 *
 * Returns a valid access token, using a module-level cache to avoid calling
 * getSession() on every request:
 *
 *  1. If the cached token has more than 30 s left → return it immediately
 *     (zero network calls).
 *  2. Otherwise call getSession() once to get a fresh / refreshed token, cache
 *     it, and return it.
 *  3. Concurrent callers share one in-flight refresh via a global lock.
 *  4. Returns null (+ triggers logout) when refresh fails.
 */
export async function getFreshToken(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);

  // ── 1. Fast path: valid cached token ──────────────────────────────────────
  if (cachedToken && cachedTokenExp && now < cachedTokenExp - 30) {
    return cachedToken;
  }

  // ── 2. Slow path: fetch session from NextAuth ──────────────────────────────
  const session = await getSession();
  let token = (session as { access_token?: string | null })?.access_token ?? null;
  const sessionError = (session as { error?: string })?.error;

  if (sessionError === 'RefreshAccessTokenError' || sessionError === 'RefreshTokenExpired') {
    console.warn('getFreshToken: Session error:', sessionError);
    invalidateCache();
    if (typeof window !== 'undefined') await logout('/');
    return null;
  }

  if (token) {
    // Decode exp so we can decide whether to use the token or trigger a refresh
    let exp: number | null = null;
    try {
      const decoded = jwtDecode<{ exp?: number }>(token);
      exp = decoded.exp ?? null;
    } catch (err) {
      console.error('getFreshToken: Failed to decode JWT:', err);
    }

    if (exp && now >= exp - 30) {
      // ── 3. Token near/past expiry → refresh with global lock ───────────────
      console.log('getFreshToken: Token near expiry, refreshing...');

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            // Triggers NextAuth jwt callback → refreshAccessToken on the server
            const updatedSession = await getSession();
            const refreshedToken =
              (updatedSession as { access_token?: string | null })?.access_token ?? null;
            const updatedError = (updatedSession as { error?: string })?.error;

            if (
              updatedError === 'RefreshAccessTokenError' ||
              updatedError === 'RefreshTokenExpired' ||
              !refreshedToken
            ) {
              console.warn('getFreshToken: Refresh failed, error:', updatedError);
              invalidateCache();
              return null;
            }

            // Cache the refreshed token
            try {
              const d = jwtDecode<{ exp?: number }>(refreshedToken);
              cachedToken = refreshedToken;
              cachedTokenExp = d.exp ?? null;
            } catch {
              // If decode fails, still return the token but don't cache
              cachedToken = null;
              cachedTokenExp = null;
            }
            return refreshedToken;
          } catch (err) {
            console.error('getFreshToken: Refresh error:', err);
            invalidateCache();
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      token = await refreshPromise;
    } else {
      // ── 4. Token is still valid → cache it ───────────────────────────────
      cachedToken = token;
      cachedTokenExp = exp;
    }
  }

  if (!token) {
    console.warn('getFreshToken: No valid token, redirecting to login');
    invalidateCache();
    if (typeof window !== 'undefined') await logout('/');
    return null;
  }

  return token;
}

/**
 * apiFetch
 *
 * Authenticated drop-in replacement for fetch() for plain REST calls.
 * GraphQL calls go through the requestMiddleware in api.ts instead.
 *
 * - Obtains a fresh token via getFreshToken() (cached when possible).
 * - Attaches Authorization: Bearer <token>.
 * - Forces logout on 401 responses.
 */
export async function apiFetch(
  url: RequestInfo | URL,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getFreshToken();

  if (!token) {
    throw new Error('No access token available. Redirecting to login...');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    console.warn('apiFetch: 401 from backend, forcing logout');
    invalidateCache();
    if (typeof window !== 'undefined') await logout('/');
  }

  return response;
}
