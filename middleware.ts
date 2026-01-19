import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;
const locales = ['en'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip assets & internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return;
  }

  // Check if pathname already has a locale prefix
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  // If no locale, redirect to /en + pathname
  if (!hasLocale) {
    // Handle root path: redirect to /en (not /en/)
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/en', req.url));
    }
    // For all other paths, prepend /en
    return NextResponse.redirect(new URL(`/en${pathname}`, req.url));
  }
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};

