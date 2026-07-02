'use client';

import React from 'react';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, IconButton, Spinner } from 'opub-ui';
import { ProfileMenu } from '@/components/common/ProfileMenu';
import { Icons } from '@/components/icons';
import MobileNav from './MobileNav';

type NavLink = {
  label: string;
  href: string;
};

const buildNavigationLinks = (): NavLink[] => {
  return [];
};

const MainNav = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const navigationLinks = React.useMemo(buildNavigationLinks, []);

  return (
    <header className="sticky top-0 z-[99999]">
      <nav className="w-full bg-primaryPurple2">
        <div className="w-full px-3 sm:px-4 lg:px-8">
          {/* Top bar container */}
          <div className="flex min-h-[80px] items-center justify-between gap-4 py-4 lg:min-h-[60px] lg:py-3">
            {/* LEFT: Logo (MobileNav only visible on mobile) */}
            <div className="flex items-center gap-3">
              {/* Mobile Navigation - only visible on mobile */}
              <div className="lg:hidden">
                <MobileNav navigationLinks={navigationLinks} session={session} status={status} />
              </div>

              {/* Logo - always visible */}
              <div className="flex flex-shrink-0 items-center">
                <Link href="/" className="flex items-center" aria-label="ParakhAI Home">
                  <div
                    className="relative h-6 
                                w-[100px] overflow-hidden 
                                md:h-7 md:w-[120px] 
                                lg:h-[55px] lg:w-[165px] lg:p-[6.53px]"
                  >
                    <Image
                      src="/images/logos/parakhai-logo.png"
                      alt="ParakhAI"
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 100px, (max-width: 1024px) 120px, 165px"
                    />
                  </div>
                </Link>
              </div>
            </div>

            {/* RIGHT: Navigation Links + Avatar/Profile (desktop only) */}
            <div className="hidden items-center gap-6 lg:flex">
              {/* Navigation Links */}
              {navigationLinks.map((link) => {
                const isExternal =
                  link.href.startsWith('http://') || link.href.startsWith('https://');
                const normalizedPath = (() => {
                  if (!pathname) return '/';
                  // Strip the leading locale segment if present: "/en/dashboard" -> "/dashboard"
                  const withoutLocale = pathname.replace(/^\/[^/]+(?=\/)/, '');
                  return withoutLocale || '/';
                })();

                // Keep "Evaluation Workspace" highlighted for all nested Evaluation Workspace routes
                const isDashboardLink = link.href === '/dashboard';
                const isActive =
                  !isExternal &&
                  (isDashboardLink
                    ? normalizedPath.startsWith('/dashboard') ||
                      (pathname && pathname.includes('/dashboard'))
                    : normalizedPath === link.href || normalizedPath.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className={`inline-flex h-11 items-center gap-[10px] whitespace-nowrap rounded-[8px] px-6 py-3 transition-colors duration-150 ${
                      isActive
                        ? 'bg-[rgba(237,233,254,0.15)]' // active pill background with 15% opacity
                        : 'hover:bg-[#3A199C]' // subtle hover for inactive
                    }`}
                  >
                    <span
                      className={`text-base font-semibold leading-6 ${
                        isActive ? 'text-[#F5FFCC]' : 'text-white'
                      }`}
                    >
                      {link.label}
                    </span>
                  </Link>
                );
              })}

              {/* Profile/Sign In */}
              <div className="ml-6 flex items-center gap-3">
                {status === 'loading' ? (
                  <Spinner />
                ) : session ? (
                  <ProfileMenu
                    user={{
                      name: session.user?.name,
                      email: session.user?.email,
                    }}
                    align="end"
                    side="bottom"
                    sideOffset={4}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => signIn('keycloak')}
                    className="text-black text-base 
                               rounded-lg border ease 
                               inline-flex items-center justify-center rounded-2 border-transparent 
                               bg-secondaryGreen px-6 py-3 
                               font-medium uppercase transition-all 
                               duration-150
                               hover:opacity-80
                               focus:outline-none focus:ring-2 focus:ring-baseVioletSolid6 focus:ring-offset-0"
                  >
                    LOGIN / SIGN UP
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default MainNav;
