"use client";

import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from 'opub-ui';

interface BreadCrumbsProps {
  data: { href: string; label: string }[];
}

const BreadCrumbs: React.FC<BreadCrumbsProps> = ({ data }) => {
  const pathname = usePathname();

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

  // Truncate breadcrumbs only if there are more than 3 items, but only on small/medium screens
  // On desktop (lg+), show all items without truncation
  const shouldTruncate = data.length > 3;
  const displayData = useMemo(() => {
    // Don't truncate on desktop - show all items
    // Truncation will be handled via CSS on smaller screens
    return data;
  }, [data]);
  
  // For small/medium screens: show truncated version
  const displayDataTruncated = useMemo(() => {
    if (!shouldTruncate) return data;
    
    // Show first item, ellipsis, and last 2 items
    return [
      data[0], // First item (usually "Home")
      { href: '#', label: '...' }, // Ellipsis
      ...data.slice(-2), // Last 2 items
    ];
  }, [data, shouldTruncate]);

  // Helper function to truncate text for small screens (more than 60 characters)
  const truncateTextForSmallScreen = (text: string): string => {
    if (text.length > 60) {
      return text.substring(0, 57) + '...';
    }
    return text;
  };

  return (
        <div className="breadcrumbs-wrap border-b sticky top-[80px] sm:top-[80px] md:top-[80px] lg:top-[72px] z-[99998] flex items-center bg-secondaryGreen overflow-visible">
          <div className="breadcrumbs-inner w-full h-8 py-1 lg:pt-2 lg:pb-3 px-3 sm:px-4 md:px-6 lg:px-8 lg:min-h-[32px] overflow-visible">
          <Breadcrumb className="mx-1 breadcrumbs-ml">
          <BreadcrumbList className="flex flex-wrap items-center gap-1 sm:gap-2">
            {/* Desktop: Show all items - hidden on small/medium, visible on lg+ */}
            {displayData.map((item, index) => {
              // Don't add locale prefix if href is '#' or starts with http/https
              const href = item.href === '#' || item.href.startsWith('http://') || item.href.startsWith('https://')
                ? item.href
                : `${localePrefix}${item.href}`;
              
              const isLastItem = index === displayData.length - 1;
              
              return (
                <span key={`desktop-${index}`} className="hidden lg:contents">
                  {isLastItem ? (
                    <BreadcrumbItem>
                      <BreadcrumbPage
                        title={item.label}
                        className="text-gray-800 breadcrumb-item breadcrumb-last-item"
                      >
                        <span className="font-bold text-base" title={item.label}>
                          {item.label}
                        </span>
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href={href}
                        title={item.label}
                        className="text-gray-600 hover:text-gray-800 breadcrumb-item breadcrumb-link-item"
                      >
                        <span className="text-base" title={item.label}>
                          {item.label}
                        </span>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  )}
                  {index < displayData.length - 1 && <BreadcrumbSeparator />}
                </span>
              );
            })}
            
            {/* Small/Medium screens: Show truncated version - visible on small/medium, hidden on lg+ */}
            {displayDataTruncated.map((item, index) => {
              // Don't add locale prefix if href is '#' or starts with http/https
              const href = item.href === '#' || item.href.startsWith('http://') || item.href.startsWith('https://')
                ? item.href
                : `${localePrefix}${item.href}`;
              
              const isEllipsis = item.label === '...';
              const isLastItem = index === displayDataTruncated.length - 1;
              
              return (
                <span key={`mobile-${index}`} className="contents lg:hidden">
                  {isLastItem ? (
                    <BreadcrumbItem>
                      <BreadcrumbPage
                        title={item.label}
                        className="text-gray-800 breadcrumb-item breadcrumb-last-item"
                      >
                        <span className="font-bold text-sm sm:text-base truncate max-w-[200px] sm:max-w-none" title={item.label}>
                          <span className="sm:hidden">{truncateTextForSmallScreen(item.label)}</span>
                          <span className="hidden sm:inline">{item.label}</span>
                        </span>
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  ) : isEllipsis ? (
                    <BreadcrumbItem>
                      <span className="text-gray-600 breadcrumb-item text-sm sm:text-base">
                        {item.label}
                      </span>
                    </BreadcrumbItem>
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href={href}
                        title={item.label}
                        className="text-gray-600 hover:text-gray-800 breadcrumb-item breadcrumb-link-item"
                      >
                        <span className="text-sm sm:text-base truncate max-w-[120px] sm:max-w-[200px] md:max-w-none" title={item.label}>
                          <span className="sm:hidden">{truncateTextForSmallScreen(item.label)}</span>
                          <span className="hidden sm:inline">{item.label}</span>
                        </span>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  )}
                  {index < displayDataTruncated.length - 1 && <BreadcrumbSeparator />}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
};

export default BreadCrumbs;
