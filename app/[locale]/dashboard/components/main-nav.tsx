'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Session } from 'next-auth';
import { signIn, signOut, useSession } from 'next-auth/react';
import {
  Avatar,
  Button,
  Dialog,
  Divider,
  IconButton,
  Popover,
  SearchInput,
  Spinner,
  Text,
  Icon,
} from 'opub-ui';

import { useDashboardStore } from '@/config/store';
import { Icons } from '@/components/icons';

const profileLinks = [
  {
    label: 'Dashboard',
    href: '/dashboard',
  },
];

const navigationLinks = [
  { label: 'Models', href: '/models' },
  { label: 'AI Makers', href: '/ai-makers' },
  { label: 'Auditors', href: '/auditors' },
  { label: 'Resources', href: '/resources' },
  { label: 'Dashboard', href: '/dashboard' },
];

const MainNav = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <nav className="bg-primary-purple">
      <div className="max-w-7xl mx-auto px-12 sm:px-16 lg:px-32">
        <div className="relative flex justify-between items-center h-30 pt-10 pr-10 pb-7 pl-10">
          {/* Logo */}
          <div className="flex items-center -ml-[270px]">
            <Link href="/" className="flex items-center" aria-label="ParakhAI Home">
              <Image src="/images/logos/parakhai-logo.png" alt="ParakhAI" width={169} height={50}  className="h-[55px] w-[169px] p-[6.53px]" />
            </Link>
          </div>

          {/* Center Section: Search + Navigation Links */}
          <div className="flex items-center gap-6 absolute -right-[116px]">
            {/* Search Icon */}
            <button
              type="button"
              className="text-white hover:opacity-80 transition-opacity"
            >
              <Icon source={Icons.search} size={24} color="onBgDefault" />
            </button>

            {/* Navigation Links */}
            {navigationLinks.map((link) => {
              const normalizedPath = (() => {
                if (!pathname) return '/';
                // Strip the leading locale segment if present: "/en/dashboard" -> "/dashboard"
                const withoutLocale = pathname.replace(/^\/[^/]+(?=\/)/, '');
                return withoutLocale || '/';
              })();
              const isActive =
                normalizedPath === link.href || normalizedPath.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
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
          </div>

          {/* Right: Profile/Sign In */}
          <div className="flex items-center ml-auto -mr-60 gap-3">
            {status === 'loading' ? (
              <Spinner />
            ) : session ? (
              <Popover open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <Popover.Trigger>
                  <button className="flex items-center justify-center rounded-full overflow-hidden hover:opacity-80 transition-opacity h-[44px] w-[44px]">
                    <Avatar showInitials name={session.user?.name || session.user?.email || 'User'} size="medium" />
                  </button>
                </Popover.Trigger>
                <Popover.Content align="end">
                  <div className="p-4 min-w-[220px]">
                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar showInitials name={session.user?.name || 'User'} size="medium" />
                      <div>
                        <Text variant="bodyMd" className="font-medium">
                          {session.user?.name || 'User'}
                        </Text>
                        <Text variant="bodySm" className="text-gray-500">
                          {session.user?.email}
                        </Text>
                      </div>
                    </div>

                    <Divider />

                    <div className="mt-4 space-y-2">
                      {profileLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          {link.label}
                        </Link>
                      ))}

                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </Popover.Content>
              </Popover>
            ) : (
              <button
                onClick={() => signIn('keycloak')}
                className="text-sm font-medium hover:opacity-80 transition-opacity"
              >
                <span className="text-white">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MainNav;