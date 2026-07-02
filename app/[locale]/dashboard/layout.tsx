import { Metadata } from 'next';
import { DashboardGuard } from '@/features/dashboard/components/DashboardGuard';
import MainFooter from '@/components/layout/MainFooter';
import MainNav from '@/components/layout/MainNav';

export const metadata: Metadata = {
  title: 'Dashboard | ParakhAI',
  description: 'ParakhAI Dashboard - Select Your Role',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <div className="min-h-screen flex flex-col bg-[var(--page-background)]">
        <MainNav />
        <main className="flex-1 relative z-0">
          {children}
        </main>
        <MainFooter />
      </div>
    </DashboardGuard>
  );
}
