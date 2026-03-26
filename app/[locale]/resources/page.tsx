"use client";

import { Loading } from "@/components/loading";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Image from "next/image";

// Dynamically import components that use opub-ui to avoid SSR issues
const MainNav = dynamic(
  () => import("@/app/[locale]/dashboard/components/main-nav"),
  { ssr: false }
);
const MainFooter = dynamic(
  () => import("@/app/[locale]/dashboard/components/main-footer"),
  { ssr: false }
);

export default function ResourcesPage() {
  const { status } = useSession();

  if (status === "loading") {
    return <Loading />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MainNav />
      <main className="flex-1 flex items-center justify-center bg-[#F9F9FB]">
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

