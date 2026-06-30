'use client';

import React, { useEffect, useState } from 'react';
import { Session } from 'next-auth';
import { Icon } from 'opub-ui';
import { Icons } from '@/components/icons';
import Sidebar from './sidebar';

type NavItem = { label: string; href: string };

type MobileNavProps = {
  navigationLinks: NavItem[];
  session: Session | null;
  status: 'authenticated' | 'loading' | 'unauthenticated';
};

const MobileNav = ({ navigationLinks, session, status }: MobileNavProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hide breadcrumb globally while the mobile sidebar is open
  useEffect(() => {
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    if (!root) return;
    if (isMobileMenuOpen) {
      root.classList.add('mobile-menu-open');
    } else {
      root.classList.remove('mobile-menu-open');
    }
    return () => root.classList.remove('mobile-menu-open');
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="mobile-hamburger-button text-white hover:opacity-80 transition-opacity mr-4 lg:hidden border-none bg-transparent p-0 m-0"
        aria-label="Open menu"
        style={{ border: 'none', background: 'transparent', padding: 0, margin: 0 }}
      >
        <Icon source={Icons.menu} size={24} color="onBgDefault" />
      </button>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sidebar
          open={isMobileMenuOpen}
          setOpen={setIsMobileMenuOpen}
          data={navigationLinks}
          session={session}
          status={status}
        />
      </div>
    </>
  );
};

export default MobileNav;

