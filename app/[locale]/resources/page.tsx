'use client';

import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Loading } from '@/components/common/loading';

const MainNav = dynamic(() => import('@/components/layout/MainNav'), {
  ssr: false,
});
const MainFooter = dynamic(() => import('@/components/layout/MainFooter'), {
  ssr: false,
});

export default function ResourcesPage() {
  const { status } = useSession();

  if (status === 'loading') {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex flex-1 items-center justify-center bg-[#F9F9FB]">
        <div className="flex flex-col items-center justify-center gap-6 py-20">
          <h1 className="resources-page-heading">Under construction</h1>
          <Image
            src="/images/icons/Under construction.png"
            alt="Under construction"
            width={200}
            height={200}
            className="object-contain"
          />
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
