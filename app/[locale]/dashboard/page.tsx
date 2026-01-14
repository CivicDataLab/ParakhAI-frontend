'use client';

import Link from 'next/link';
import { Text } from 'opub-ui';

import BreadCrumbs from '@/components/Breadcrumbs';
import { Icons } from '@/components/icons';
import { useDashboardStore } from '@/config/store';
import { Loading } from '@/components/loading';

// Keep environment variable for later use
// const aiMakerBaseUrl = process.env.NEXT_PUBLIC_AI_MAKER_URL;

const UserDashboard = () => {
  const { userDetails } = useDashboardStore();

  // For now, use local route. Environment variable will be used later
  const aiMakerLink = '/dashboard/ai-maker';

  const list = [
    {
      label: 'AI Maker',
      icon: '/images/icons/topology-star-3.png',
      path: aiMakerLink,
    },
    {
      label: 'Auditor',
      icon: '/images/icons/file-analytics.png',
      path: '/dashboard/auditor',
    },
  ];

  return (
    <>
      <BreadCrumbs
        data={[
          { href: '/', label: 'Home' },
          {
            href: '/dashboard',
            label: 'User Dashboard',
          },
        ]}
      />

      {!userDetails?.me ? (
        <Loading />
      ) : (
        <div className="role-selection-container max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-32 pb-10 pt-6 overflow-visible">
          <div className="flex flex-col items-start pt-4 sm:pt-6 md:pt-8 overflow-visible relative">
            {/* Main Title */}
            <div className="role-selection-title text-left w-full mb-8 sm:mb-10 md:mb-12 lg:mb-16 
                            sm:relative sm:left-0 sm:ml-0
                            lg:absolute lg:left-[-60px] lg:w-[1216px] lg:ml-0">
              <h1 className="font-bold text-2xl sm:text-3xl md:text-[32px] leading-tight sm:leading-[40px] text-[#0A0704]">
                Select Your Role
              </h1>
            </div>

            {/* Role Selection Cards */}
            <div className="role-cards-wrapper flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 w-full justify-start overflow-visible
                            sm:relative sm:left-0 sm:top-0 sm:ml-0
                            lg:absolute lg:left-[-60px] lg:top-[120px]">
              {list.map((item, index) => {
                const isExternal = item.path.startsWith('http://') || item.path.startsWith('https://');
                return (
                  <Link
                    key={index}
                    href={item.path}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className="role-card flex flex-col items-center justify-center gap-2 sm:gap-3 py-4 sm:py-5 px-3 sm:px-4 
                               bg-secondaryGreen border-2 border-secondaryGreen rounded-[16px] 
                               transition-all duration-300 w-full sm:w-auto sm:flex-1 lg:flex-1 
                               sm:min-w-0"
                  >
                    <div className="flex items-center justify-center">
                      <img 
                        src={item.icon} 
                        alt={item.label} 
                        width={60} 
                        height={60} 
                        className="object-contain w-12 h-12 sm:w-14 sm:h-14 md:w-[60px] md:h-[60px]" 
                      />
                    </div>
                    <Text variant="headingLg" className="text-gray-900 font-semibold text-lg sm:text-xl text-center">
                      {item.label}
                    </Text>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDashboard;