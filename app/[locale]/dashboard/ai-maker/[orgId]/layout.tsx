"use client";

import BreadCrumbs from "@/components/Breadcrumbs";
import { useGraphQL } from "@/lib/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import WelcomeSection from "../../components/WelcomeSection";
import { OrganizationContext } from "./OrganizationContext";

const GET_ORG_DETAILS = `
  query GetOrgDetails($orgId: ID!) {
    organization(id: $orgId) {
      id
      name
      logoUrl
    }
  }
`;

export default function AIMakerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgId = params?.orgId as string;
  const { request, isAuthenticated, isLoading: isSessionLoading } = useGraphQL();

  const [organization, setOrganization] = useState<{
    name: string;
    logoUrl: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch organization details
  useEffect(() => {
    if (!isAuthenticated || isSessionLoading || !orgId) return;

    const fetchOrganization = async () => {
      try {
        setIsLoading(true);

        const orgData = await request(GET_ORG_DETAILS, { orgId: orgId });

        if (orgData?.organization) {
          setOrganization(orgData.organization);
        }
      } catch (err: any) {
        console.error("Error fetching organization:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, [isAuthenticated, isSessionLoading, orgId, request]);

  const locale = params?.locale || "en";

  return (
    <OrganizationContext.Provider value={{ organization, isLoading }}>
      <div className="flex flex-col min-h-screen bg-white overflow-x-visible">
        <BreadCrumbs
          data={[
            { href: "/", label: "Home" },
            { href: "/dashboard", label: "User Dashboard" },
            { href: `/${locale}/dashboard/ai-maker`, label: "AI Maker" },
            {
              href: `/${locale}/dashboard/ai-maker/${orgId}`,
              label: organization?.name || "Dashboard",
            },
          ]}
        />
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 overflow-x-visible">
          <div className="flex flex-1 flex-col lg:flex-row gap-6 md:gap-8 lg:-ml-[120px] xl:-ml-[130px]">
            <WelcomeSection
              orgName={organization?.name}
              orgLogo={organization?.logoUrl}
            />

            <div className="flex-1 bg-gray-50 p-4 sm:p-6 lg:p-10 mt-6 lg:mt-0">
              {children}
            </div>
          </div>
        </div>
      </div>
    </OrganizationContext.Provider>
  );
}

