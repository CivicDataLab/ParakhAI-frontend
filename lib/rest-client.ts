import { jwtDecode } from 'jwt-decode';
import { getSession } from 'next-auth/react';
import { logout } from '@/lib/auth';

let cachedToken: string | null = null;
let cachedTokenExp: number | null = null;
let refreshPromise: Promise<string | null> | null = null;

function invalidateCache() {
  cachedToken = null;
  cachedTokenExp = null;
}

export async function getFreshToken(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedTokenExp && now < cachedTokenExp - 30) {
    return cachedToken;
  }

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
    let exp: number | null = null;
    try {
      const decoded = jwtDecode<{ exp?: number }>(token);
      exp = decoded.exp ?? null;
    } catch (err) {
      console.error('getFreshToken: Failed to decode JWT:', err);
    }

    if (exp && now >= exp - 30) {
      console.log('getFreshToken: Token near expiry, refreshing...');

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
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

            try {
              const d = jwtDecode<{ exp?: number }>(refreshedToken);
              cachedToken = refreshedToken;
              cachedTokenExp = d.exp ?? null;
            } catch {
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

export async function apiFetch(url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> {
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
