"use client";

import { Loading } from "@/components/common/loading";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

const MainNav = dynamic(() => import("@/components/layout/MainNav"), { ssr: false });
const MainFooter = dynamic(() => import("@/components/layout/MainFooter"), { ssr: false });
const HeroSection = dynamic(() => import("@/features/home/components/HeroSection"), { ssr: false });
const SectorsSection = dynamic(() => import("@/features/home/components/SectorsSection"), { ssr: false });
const GetStartedSection = dynamic(() => import("@/features/home/components/GetStartedSection"), { ssr: false });
const HowItWorksSection = dynamic(() => import("@/features/home/components/HowItWorksSection"), { ssr: false });
const TrendingSection = dynamic(() => import("@/features/home/components/TrendingSection"), { ssr: false });

export default function Home() {
  const { status } = useSession();

  if (status === "loading") {
    return <Loading />;
  }

  return (
    <div className="home-page-container min-h-screen flex flex-col">
      <MainNav />
      <div className="flex-1">
        <HeroSection />
        {/* <SectorsSection /> */}
        <HowItWorksSection />
        <GetStartedSection />
        <TrendingSection />
      </div>
      <MainFooter />
    </div>
  );
}
