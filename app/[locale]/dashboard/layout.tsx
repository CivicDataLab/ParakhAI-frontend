import { Metadata } from 'next';
import { DashboardGuard } from './components/DashboardGuard';
import MainFooter from './components/main-footer';
import MainNav from './components/main-nav';

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
      <div className="min-h-screen flex flex-col bg-white">
        <header className="sticky top-0 z-[99999]">
          <MainNav />
        </header>
        <main className="flex-1 relative z-0">
          {children}
        </main>
        <footer>
          <MainFooter />
        </footer>
      </div>
    </DashboardGuard>
  );
}
