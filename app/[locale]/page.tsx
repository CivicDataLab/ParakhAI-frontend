'use client';

import { useSession } from "next-auth/react";
import dynamic from 'next/dynamic';

// Dynamically import components that use opub-ui to avoid SSR issues
const MainNav = dynamic(() => import("@/app/[locale]/dashboard/components/main-nav"), { ssr: false });
const MainFooter = dynamic(() => import("@/app/[locale]/dashboard/components/main-footer"), { ssr: false });
const HeroSection = dynamic(() => import("@/app/[locale]/components/HeroSection"), { ssr: false });
const SectorsSection = dynamic(() => import("@/app/[locale]/components/SectorsSection"), { ssr: false });
const GetStartedSection = dynamic(() => import("@/app/[locale]/components/GetStartedSection"), { ssr: false });
const HowItWorksSection = dynamic(() => import("@/app/[locale]/components/HowItWorksSection"), { ssr: false });

export default function Home() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="home-page-container min-h-screen flex flex-col">
      <MainNav />
      <main className="flex-1">
        <HeroSection />
        <SectorsSection />
        <GetStartedSection />
        <HowItWorksSection />
      </main>
      <MainFooter />
    </div>
  );
}
