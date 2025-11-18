'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Spinner, Icon } from 'opub-ui';

import { Icons } from '@/components/icons';
import { ProfileMenu } from '@/components/ProfileMenu';
import MobileNav from './mobile-nav';

const aiMakerBaseUrl = process.env.NEXT_PUBLIC_AI_MAKER_URL;

const buildNavigationLinks = () => {
  const aiMakerLink = aiMakerBaseUrl
    ? `${aiMakerBaseUrl.replace(/\/$/, '')}/organization`
    : '/dashboard/ai-maker';

  return [
    { label: 'Models', href: '/models' },
    { label: 'AI Makers', href: aiMakerLink },
    { label: 'Auditors', href: '/auditors' },
    { label: 'Resources', href: '/resources' },
    { label: 'Dashboard', href: '/dashboard' },
  ];
};

const loginButtonClasses = 'login-signup-button';

const MainNav = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const navigationLinks = React.useMemo(buildNavigationLinks, []);

  return (
    <>
      <nav className="bg-primary-purple relative z-[9999]">
        <div className="max-w-7xl mx-auto px-12 sm:px-16 lg:px-32">
          <div className="desktop-nav-container relative flex justify-between items-center h-30 pt-10 pr-10 pb-7 pl-10">
            {/* Mobile Navigation */}
            <MobileNav 
              navigationLinks={navigationLinks}
              session={session}
              status={status}
            />

            {/* Logo */}
            <div className="desktop-nav-logo flex items-center -ml-[270px]">
              <Link href="/" className="flex items-center" aria-label="ParakhAI Home">
                <Image src="/images/logos/parakhai-logo.png" alt="ParakhAI" width={169} height={50}  className="h-[55px] w-[169px] p-[6.53px]" />
              </Link>
            </div>

            {/* Center Section: Search + Navigation Links */}
            <div className="desktop-nav-center flex items-center gap-6 absolute -right-[116px]">
              {/* Search Icon */}
              <button
                type="button"
                className="text-white hover:opacity-80 transition-opacity"
              >
                <Icon source={Icons.search} size={24} color="onBgDefault" />
              </button>

              {/* Navigation Links */}
              {navigationLinks.map((link) => {
                const isExternal = link.href.startsWith('http://') || link.href.startsWith('https://');
                const normalizedPath = (() => {
                  if (!pathname) return '/';
                  // Strip the leading locale segment if present: "/en/dashboard" -> "/dashboard"
                  const withoutLocale = pathname.replace(/^\/[^/]+(?=\/)/, '');
                  return withoutLocale || '/';
                })();
                const isActive =
                  !isExternal && (normalizedPath === link.href || normalizedPath.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className={`inline-flex items-center h-6 py-[2px] px-[5px] rounded hover:opacity-80 transition-opacity whitespace-nowrap ${
                      isActive ? 'underline decoration-secondary-green' : ''
                    }`}
                  >
                    <span 
                      className={`text-base font-semibold leading-6 ${
                        isActive ? 'text-secondary-green' : 'text-white'
                      }`}
                    >
                      {link.label}
                    </span>
                  </Link>
                );
              })}
              
              {/* Profile/Sign In - positioned after navigation links */}
              <div className="desktop-nav-right flex items-center gap-3 ml-6">
                {status === 'loading' ? (
                  <Spinner />
                ) : session ? (
                  <ProfileMenu
                    user={{ name: session.user?.name, email: session.user?.email }}
                    align="end"
                    side="bottom"
                    sideOffset={4}
                    contentClassName="profile-popover-content bg-white border border-gray-200 shadow-lg rounded-xl z-[10000]"
                  />
                ) : (
              <button onClick={() => signIn('keycloak')} className={loginButtonClasses}>
                    LOGIN / SIGN UP
              </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
  
export default MainNav;