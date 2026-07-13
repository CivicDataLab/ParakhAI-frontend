'use client';

import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { Loading } from '@/components/common/loading';

const MainNav = dynamic(() => import('@/components/layout/MainNav'), {
  ssr: false,
});
const MainFooter = dynamic(() => import('@/components/layout/MainFooter'), {
  ssr: false,
});
const ResourcesPageContent = dynamic(
  () => import('@/features/resources/components/ResourcesPageContent').then((mod) => mod.default),
  { ssr: false }
);

export default function ResourcesPage() {
  const { status } = useSession();

  if (status === 'loading') {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 bg-[#F9F9FB]">
        <ResourcesPageContent />
      </main>
      <MainFooter />
    </div>
  );
}
