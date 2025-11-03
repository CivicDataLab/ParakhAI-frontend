"use client";

import React from 'react';
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
  return (
    <div className="border-b sticky top-30 z-10 flex items-center bg-secondary-green">
      <div className="w-full max-w-7xl mx-auto h-8 py-1 px-10">
      <Breadcrumb className="mx-1 -ml-30">
        <BreadcrumbList className="">
          {data.map((item, index) => (
            <React.Fragment key={index}>
              {index === data.length - 1 ? (
                <BreadcrumbItem>
                  <BreadcrumbPage
                    title={item.label}
                    className="max-w-[16ch] truncate text-gray-800 lg:max-w-[40ch]"
                  >
                    <span className="font-bold">{item.label}</span>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href={item.href}
                    title={item.label}
                    className="max-w-[16ch] truncate text-gray-600 hover:text-gray-800 lg:max-w-[40ch]"
                  >
                    {item.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              )}
              {index < data.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      </div>
    </div>
  );
};

export default BreadCrumbs;
