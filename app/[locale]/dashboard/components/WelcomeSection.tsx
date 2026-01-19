'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Divider } from 'opub-ui';
import { useEffect, useMemo, useState } from 'react';
import { useAppSession } from '@/lib/session';

type BaseNavItem = {
  icon: string;
  label: string;
  isImage: boolean;
  path?: string;
};

const baseNavItems: BaseNavItem[] = [
  { icon: '/images/icons/home-2.png', label: 'Home', isImage: true, path: '/dashboard/ai-maker' },
  { icon: '/images/icons/topology-star-ring.png', label: 'Models', isImage: true, path: '/dashboard/ai-maker/ai-models' },
  { icon: '/images/icons/report-analytics.png', label: 'Evaluations', isImage: true, path: '/dashboard/ai-maker/evaluations' },
  { icon: '/images/icons/messages.png', label: 'Prompt Libraries', isImage: true, path: '/dashboard/ai-maker/prompt-libraries' },
  { icon: '/images/icons/users-group.png', label: 'Members & Experts', isImage: true },
  { icon: '/images/icons/settings.png', label: 'Settings', isImage: true },
];

const WelcomeSection = () => {
  const pathname = usePathname();
  const { user } = useAppSession();

  const normalizedPath = useMemo(() => {
    if (!pathname) return '/';
    // Only remove locale prefix if it's a valid locale
    const validLocales = ['en', 'hi']; // Match config/locales.ts
    const match = pathname.match(/^\/([^/]+)/);
    let withoutLocale = pathname;
    
    if (match && validLocales.includes(match[1])) {
      // Remove locale prefix if it's a valid locale
      withoutLocale = pathname.replace(/^\/[^/]+/, '') || '/';
    }
    
    return withoutLocale.endsWith('/') && withoutLocale.length > 1
      ? withoutLocale.slice(0, -1)
      : withoutLocale;
  }, [pathname]);

  const [selectedItem, setSelectedItem] = useState<string>(() => {
    const activeFromPath = baseNavItems.find((item) => {
      if (!item.path) return false;
      return normalizedPath === item.path || normalizedPath.startsWith(`${item.path}/`);
    });
    return activeFromPath ? activeFromPath.label : 'Home';
  });

  const localePrefix = useMemo(() => {
    if (!pathname) return '';
    const match = pathname.match(/^\/([^/]+)/);
    if (!match) return '';
    const firstSegment = match[1];
    // Only treat as locale if it's a valid locale (en, hi, etc.)
    // With 'as-needed', default locale (en) might not have prefix, so check both
    const validLocales = ['en', 'hi']; // Match config/locales.ts
    return validLocales.includes(firstSegment) ? `/${firstSegment}` : '';
  }, [pathname]);

  const navItems = useMemo(
    () =>
      baseNavItems.map((item) => ({
        ...item,
        href: item.path ? `${localePrefix}${item.path}` : '#',
        path: item.path,
      })),
    [localePrefix],
  );

  // Set initial selected item based on pathname
  useEffect(() => {
    let activeFromPath = navItems.find((item) => {
      if (!item.path) return false;
      return normalizedPath === item.path;
    });

    if (!activeFromPath) {
      activeFromPath = navItems
        .filter((item) => item.path)
        .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))
        .find((item) => {
          if (!item.path) return false;
          return normalizedPath.startsWith(`${item.path}/`);
        });
    }

    if (activeFromPath) {
      setSelectedItem(activeFromPath.label);
    }
  }, [navItems, normalizedPath]);

  return (
    <div className="welcome-section mt-6">
      {/* Welcome Section */}
      <div className="text-center sm:pt-4 md:pt-0">
        {/* Logo */}
        <div className="mb-2 flex justify-center">
          <div className="cdl-logo-container">
            <Image
              src="/images/logos/CDL Logo.png"
              alt="CivicDataLab Logo"
              width={140}
              height={140}
              className="object-contain"
            />
          </div>
        </div>
        
        {/* Welcome Text */}
        <p className="welcome-text sm:pt-4 md:pt-0">
          Welcome, {user?.name || 'CivicDataLab'}
        </p>
        
        {/* Switch Roles Button */}
        <Link 
          href="/dashboard" 
          className="mt-4 mb-4 inline-flex font-medium text-[#644FC1] underline transition-colors hover:opacity-90 switch-roles-link"
        >
          Switch Roles
        </Link>
      </div>

      {/* Divider */}
      <div className="welcome-divider mt-4 mb-4">
        <Divider />
      </div>

      {/* Navigation */}
      <nav className="space-y-2 overflow-visible">
        {navItems.map((item) => {
          const isActive = selectedItem === item.label;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(event) => {
                if (item.href === '#') {
                  event.preventDefault();
                }
                setSelectedItem(item.label);
              }}
              className={`py-2 text-left transition whitespace-nowrap block nav-item-link ${
                isActive
                  ? 'font-semibold bg-primaryPurple text-white rounded-lg -mx-3 w-[calc(100%+24px)] px-6'
                  : 'hover:bg-gray-100 rounded-md text-[#60646C] font-medium px-3 w-full'
              }`}
            >
              <span className="mr-2.5 inline-block">
                {item.isImage ? (
                  <Image 
                    src={item.icon} 
                    alt={item.label} 
                    width={16} 
                    height={16} 
                    className={`inline ${isActive ? 'nav-icon-active' : 'nav-icon-inactive'}`}
                  />
                ) : (
                  item.icon
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default WelcomeSection;

