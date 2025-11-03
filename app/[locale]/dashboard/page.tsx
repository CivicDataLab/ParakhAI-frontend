'use client';

import Link from 'next/link';
import { Text } from 'opub-ui';

import BreadCrumbs from '@/components/Breadcrumbs';
import { Icons } from '@/components/icons';
import { useDashboardStore } from '@/config/store';
import { Loading } from '@/components/loading';

const UserDashboard = () => {
  const { userDetails } = useDashboardStore();
  
  const list = [
    {
      label: 'AI Maker',
      icon: '/images/icons/topology-star-3.png',
      path: '/dashboard/ai-maker',
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
            href: '#',
            label: 'Dashboard',
          },
        ]}
      />

      {!userDetails?.me ? (
        <Loading />
      ) : (
        <div className="max-w-7xl mx-auto px-12 sm:px-16 lg:px-32 pb-10 pt-6">
          <div className="flex flex-col items-start pt-8">
            {/* Main Title */}
            <div className="text-left w-[1216px] mb-12 -ml-30 h-10">
              <h1 className="font-bold text-[32px] leading-[40px] text-[#0A0704]">
                Select Your Role
              </h1>
            </div>

            {/* Role Selection Cards */}
            <div className="flex flex-row gap-8 w-full justify-start overflow-visible -ml-30">
              {list.map((item, index) => (
                <Link
                  key={index}
                  href={item.path}
                  className="role-card flex flex-col items-center justify-center gap-3 py-5 px-4 bg-secondary-green border-2 border-secondary-green rounded-[16px] transition-all duration-300"
                >
                  <div className="flex items-center justify-center">
                    <img src={item.icon} alt={item.label} width={60} height={60} className="object-contain" />
                  </div>
                  <Text variant="headingLg" className="text-gray-900 font-semibold text-xl">
                    {item.label}
                  </Text>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDashboard;