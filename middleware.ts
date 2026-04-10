import { NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import createIntlMiddleware from 'next-intl/middleware';

import locales from './config/locales';

// Public pages that don't require authentication (without locale prefix)
// The regex will automatically handle locale prefixes like /en, /hi, etc.
const publicPages = ['/'];

// Create internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales: locales.all,
  localePrefix: 'as-needed', // Only add locale prefix when needed (not for default locale)
  defaultLocale: locales.default,
});

// Create authentication middleware that chains with i18n
const authMiddleware = withAuth(
  function onSuccess(req) {
    return intlMiddleware(req);
  },
  {
    pages: {
      signIn: '/api/auth/signin',
    },
  }
);

// Main middleware function
export default function middleware(req: NextRequest) {
  // Create regex pattern to match public pages with optional locale prefix
  // This handles: /, /en, /hi, /en/, /hi/, etc.
  const publicPathnameRegex = RegExp(
    `^(/(${locales.all.join('|')}))?(${publicPages
      .flatMap((p) => (p === '/' ? ['', '/'] : p))
      .join('|')})/?$`,
    'i'
  );

  const isPublicPage = publicPathnameRegex.test(req.nextUrl.pathname);

  // If it's a public page, use i18n middleware only (no auth required)
  if (isPublicPage) {
    return intlMiddleware(req);
  }

  // For protected pages, use auth middleware (which chains with i18n)
  return (authMiddleware as any)(req);
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};

