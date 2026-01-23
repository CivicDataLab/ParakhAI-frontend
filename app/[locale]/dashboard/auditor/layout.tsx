"use client";

import BreadCrumbs from "@/components/Breadcrumbs";
import { useParams } from "next/navigation";
import WelcomeSection from "../components/WelcomeSection";

export default function AuditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const locale = params?.locale || "en";

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-visible">
      <BreadCrumbs
        data={[
          { href: "/", label: "Home" },
          { href: "/dashboard", label: "User Dashboard" },
          { href: `/${locale}/dashboard/auditor`, label: "Auditor" },
        ]}
      />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 overflow-x-visible">
        <div className="flex flex-1 flex-col lg:flex-row gap-6 md:gap-8 lg:-ml-[120px] xl:-ml-[130px]">
          <WelcomeSection dashboardType="auditor" />

          <div className="flex-1 bg-gray-50 p-4 sm:p-6 lg:p-10 mt-6 lg:mt-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
