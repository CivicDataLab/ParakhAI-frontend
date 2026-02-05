"use client";

import BreadCrumbs from "@/components/Breadcrumbs";
import { Loading } from "@/components/loading";
import { useDashboardStore } from "@/config/store";
import { useGraphQL } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Text } from "opub-ui";
import { useEffect, useState } from "react";

type Organization = {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
};

const EntityCard = ({ org, locale }: { org: Organization; locale: string }) => {
  const [isImageValid, setIsImageValid] = useState(!!org.logoUrl);
  const dataspaceUrl = process.env.NEXT_PUBLIC_DATASPACE_API_URL || "";
  const imageSrc = `${dataspaceUrl.replace(/\/$/, "")}${org.logoUrl}`;

  return (
    <Link
      key={org.name}
      href={`/${locale}/dashboard/ai-maker/${org.id}`}
      className="flex h-72 w-56 flex-col items-center bg-white gap-3 rounded-2 border-2 border-solid border-baseGraySlateSolid4 px-4 py-5 text-center transition-all hover:border-highlight group"
    >
      <div className="flex h-full w-full items-center justify-center rounded-2">
        <div className="rounded-2">
          {isImageValid ? (
            <Image
              height={160}
              width={160}
              src={imageSrc}
              alt={`${org.name} logo`}
              onError={() => setIsImageValid(false)}
              className="object-contain"
            />
          ) : (
            <Image
              height={160}
              width={160}
              src={"/images/logos/parakhai-logo.png"}
              alt={`fallback logo`}
              className="fill-current object-contain text-baseGraySlateSolid6 opacity-20"
            />
          )}
        </div>
      </div>
      <div>
        <Text
          variant="headingMd"
          className="text-center line-clamp-3 group-hover:text-highlight transition-colors"
          title={org.name}
        >
          {org.name}
        </Text>
      </div>
    </Link>
  );
};

const OrganizationSelection = () => {
  const params = useParams();
  const locale = params?.locale || "en";
  const { request } = useGraphQL();
  const { setAllEntityDetails } = useDashboardStore();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const GET_MY_ORGANIZATIONS = `
    query GetMyOrganizations {
      myOrganizations {
        id
        name
        description
        logoUrl
      }
    }
  `;

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const response = await request(GET_MY_ORGANIZATIONS);
        const orgs = response?.myOrganizations || [];
        setOrganizations(orgs);
        setAllEntityDetails({ organizations: orgs });
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgs();
  }, [request]);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--page-background)]">
      <BreadCrumbs
        data={[
          { href: "/", label: "Home" },
          { href: "/dashboard", label: "Evaluation Workspace" },
          { href: "#", label: "AI Maker" },
        ]}
      />

      <div className="flex-1 container mb-40">
        <div className="flex flex-col gap-6 py-12">
          <Text variant="headingXl">Select Organization</Text>
          <Text variant="bodyMd" className="text-gray-600">
            Choose an organization to access its AI Maker dashboard.
          </Text>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="flex flex-wrap gap-6">
            {organizations.map((org) => (
              <EntityCard key={org.id} org={org} locale={locale as string} />
            ))}

            {organizations.length === 0 && (
              <div className="col-span-full w-full py-20 text-center bg-gray-50 rounded-4">
                <Text variant="bodyLg" className="text-gray-500">
                  You are not a member of any organization yet.
                </Text>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationSelection;
