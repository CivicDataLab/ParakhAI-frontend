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
    return match ? `/${match[1]}` : '';
  }, [pathname]);

  return (
    <div className="breadcrumbs-wrap border-b sticky top-30 z-10 flex items-center bg-secondary-green">
      <div className="breadcrumbs-inner w-full max-w-7xl mx-auto h-8 py-1 px-10">
      <Breadcrumb className="mx-1 breadcrumbs-ml -ml-30">
        <BreadcrumbList className="">
          {data.map((item, index) => {
            // Don't add locale prefix if href is '#' or starts with http/https
            const href = item.href === '#' || item.href.startsWith('http://') || item.href.startsWith('https://')
              ? item.href
              : `${localePrefix}${item.href}`;
            
            return (
              <React.Fragment key={index}>
                  {index === data.length - 1 ? (
                    <BreadcrumbItem>
                      <BreadcrumbPage
                        title={item.label}
                        className="text-gray-800 breadcrumb-item breadcrumb-last-item"
                      >
                        <span className="font-bold" title={item.label}>{item.label}</span>
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href={href}
                        title={item.label}
                        className="text-gray-600 hover:text-gray-800 breadcrumb-item breadcrumb-link-item"
                      >
                        <span title={item.label}>{item.label}</span>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  )}
                {index < data.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      </div>
    </div>
  );
};

export default BreadCrumbs;
