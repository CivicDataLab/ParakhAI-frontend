import { Metadata } from 'next';
import MainNav from './components/main-nav';
import MainFooter from './components/main-footer';

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
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-50">
        <MainNav />
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer>
        <MainFooter />
      </footer>
    </div>
  );
}
