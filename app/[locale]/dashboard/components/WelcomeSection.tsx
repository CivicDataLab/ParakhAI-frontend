'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Divider } from 'opub-ui';

const navItems = [
  { icon: '/images/icons/home-2.png', label: 'Home', isImage: true, href: '#' },
  { icon: '/images/icons/bulb.png', label: 'Models', isImage: true, href: '#' },
  { icon: '/images/icons/report-analytics.png', label: 'Audits', isImage: true, href: '#' },
  { icon: '/images/icons/messages.png', label: 'Prompt Libraries', isImage: true, href: '#' },
  { icon: '/images/icons/users-group.png', label: 'Members & Auditors', isImage: true, href: '#' },
  { icon: '/images/icons/settings.png', label: 'Settings', isImage: true, href: '#' },
];

const WelcomeSection = () => {
  const pathname = usePathname();
  const [selectedItem, setSelectedItem] = useState<string>('Home');

  // Set initial selected item based on pathname
  useEffect(() => {
    if (pathname?.includes('/dashboard')) {
      const pathItem = navItems.find(item => item.href !== '#' && pathname?.includes(item.href));
      if (pathItem) {
        setSelectedItem(pathItem.label);
      }
    }
  }, [pathname]);

  return (
    <div className="welcome-section">
      {/* Welcome Section */}
      <div className="text-center">
        {/* Logo */}
        <div className="mb-2 flex justify-center">
          <div className="cdl-logo-container">
            <Image
              src="/images/logos/CDL Logo.png"
              alt="CivicDataLab Logo"
              width={100}
              height={100}
              className="object-contain"
            />
          </div>
        </div>
        
        {/* Welcome Text */}
        <p className="mb-2 text-[#0A0704] welcome-text">
          Welcome, CivicDataLab
        </p>
        
        {/* Switch Roles Button */}
        <Link 
          href="/dashboard" 
          className="mt-4 mb-4 inline-block text-base font-medium text-[#644FC1] underline transition-colors hover:opacity-90"
        >
          Switch Roles
        </Link>
      </div>

      {/* Divider */}
      <div className="welcome-divider mt-4 mb-4">
        <Divider />
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = selectedItem === item.label;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setSelectedItem(item.label)}
              className={`w-full px-3 py-2 text-left transition whitespace-nowrap block nav-item-link ${
                isActive
                  ? 'font-semibold bg-primary-purple text-white rounded-lg'
                  : 'hover:bg-gray-100 rounded-md text-[#60646C] font-medium'
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

