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
      slug
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
  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();

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
      <div className="flex flex-col min-h-screen bg-[var(--page-background)] overflow-x-visible">
        <BreadCrumbs
          data={[
            { href: "/", label: "Home" },
            { href: "/dashboard", label: "Evaluation Workspace" },
            { href: `/${locale}/dashboard/ai-maker`, label: "AI Maker" },
            {
              href: `/${locale}/dashboard/ai-maker/${orgId}`,
              label: organization?.name || "Dashboard",
            },
          ]}
        />
        <div className="flex-1 w-full px-4 sm:px-6 lg:px-10 overflow-x-visible flex pt-0 md:pt-5 lg:pt-0">
          <div className="flex w-full flex-col md:flex-row md:items-stretch gap-6 md:gap-8 h-full">
            <div className="flex-shrink-0 self-start max-md:self-center md:sticky md:top-4 w-full md:w-auto">
              <WelcomeSection
                orgName={organization?.name}
                orgLogo={organization?.logoUrl}
              />
            </div>

            <div className="flex-1 min-w-0 w-full max-w-full bg-gray-50 p-4 sm:p-6 lg:p-10 mt-6 md:mt-0 overflow-x-auto h-full">
              <div className="w-full min-w-0 max-lg:max-w-4xl max-lg:mx-auto">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </OrganizationContext.Provider>
  );
}
