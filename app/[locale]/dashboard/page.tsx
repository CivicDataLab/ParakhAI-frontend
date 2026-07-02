"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertDialog, Text } from "opub-ui";
import { useEffect, useMemo, useState } from "react";

import BreadCrumbs from "@/components/common/Breadcrumbs";
import { useDashboardStore } from "@/stores";
import { Loading } from "@/components/common/loading";
import { useGraphQL } from "@/lib/graphql-client";

const GET_MY_ORGANIZATIONS = `
  query GetMyOrganizations {
    myOrganizations {
      id
      name
      slug
      description
      logoUrl
    }
  }
`;

const UserDashboard = () => {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const router = useRouter();
  const { request } = useGraphQL();
  const { userDetails, setAllEntityDetails } = useDashboardStore();

  const [organizations, setOrganizations] = useState<{ id: string }[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [showRedirectPrompt, setShowRedirectPrompt] = useState(false);

  const aiMakerLink = `/${locale}/dashboard/ai-maker`;
  const inAppPath = aiMakerLink;
  const externalHost =
    process.env.NEXT_PUBLIC_DATASPACE_HOST ||
    process.env.NEXT_PUBLIC_AI_MAKER_URL ||
    "";
  const externalPath = "/dashboard/organization";

  const { addOrganizationUrl, externalUrl } = useMemo(() => {
    let builtExternalUrl = "";
    if (externalHost.trim() !== "") {
      const host = externalHost.replace(/\/$/, "");
      if (/\/dashboard$/.test(host)) {
        builtExternalUrl = `${host}${externalPath.replace(/^\/dashboard/, "")}`;
      } else {
        builtExternalUrl = `${host}${externalPath}`;
      }
    }
    return {
      externalUrl: builtExternalUrl,
      addOrganizationUrl: builtExternalUrl || inAppPath,
    };
  }, [externalHost, inAppPath]);

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
        setOrgsLoading(false);
      }
    };

    if (userDetails?.me) {
      fetchOrgs();
    }
  }, [request, userDetails?.me, setAllEntityDetails]);

  const handleRoleCardClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    label: string
  ) => {
    if (
      label === "AI Maker" &&
      !orgsLoading &&
      organizations.length === 0
    ) {
      event.preventDefault();
      setShowRedirectPrompt(true);
    }
  };

  const list = [
    {
      label: "AI Maker",
      description: "For people building AI",
      icon: "/images/icons/topology-star-3.png",
      path: aiMakerLink,
    },
    {
      label: "Evaluator",
      description: "For expert as evaluator",
      icon: "/images/icons/file-analytics.png",
      path: "/dashboard/auditor",
    },
  ];

  return (
    <>
      <BreadCrumbs
        data={[
          { href: "/", label: "Home" },
          {
            href: "/dashboard",
            label: "Evaluation Workspace",
          },
        ]}
      />

      {!userDetails?.me ? (
        <Loading />
      ) : (
        <div className="role-selection-container max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-32 pb-10 pt-6 overflow-visible">
          <div className="flex flex-col items-start pt-4 sm:pt-6 md:pt-8">
            {/* Main Title */}
            <div className="role-selection-title text-left w-full mb-8 sm:mb-10 md:mb-12 lg:mb-16">
              <h1 className="font-bold text-2xl sm:text-3xl md:text-[32px] leading-tight sm:leading-[40px] text-[#0A0704]">
                Select Your Role
              </h1>
            </div>

            {/* Role Selection Cards */}
            <div className="role-cards-wrapper flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 w-full justify-start">
              {list.map((item, index) => {
                const isExternal =
                  item.path.startsWith("http://") ||
                  item.path.startsWith("https://");
                const card = (
                  <Link
                    href={item.path}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    onClick={(event) => handleRoleCardClick(event, item.label)}
                    className="role-card flex flex-col items-center justify-center gap-2 sm:gap-3 py-4 sm:py-5 px-3 sm:px-4 
                               bg-secondaryGreen border-2 border-secondaryGreen rounded-[16px] 
                               transition-all duration-300 w-full sm:w-auto sm:flex-1 lg:flex-1 
                               sm:min-w-0"
                  >
                    <div className="flex items-center justify-center">
                      <img
                        src={item.icon}
                        alt={item.label}
                        width={60}
                        height={60}
                        className="object-contain w-12 h-12 sm:w-14 sm:h-14 md:w-[60px] md:h-[60px]"
                      />
                    </div>
                    <Text
                      variant="headingLg"
                      className="text-gray-900 font-semibold text-lg sm:text-xl text-center"
                    >
                      {item.label}
                    </Text>
                    <Text
                      variant="bodySm"
                      className="text-gray-600 text-center"
                    >
                      {item.description}
                    </Text>
                  </Link>
                );

                return (
                  <div
                    key={index}
                    className="w-full sm:w-auto sm:flex-1 lg:flex-1 sm:min-w-0"
                  >
                    {card}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={showRedirectPrompt}
        onOpenChange={setShowRedirectPrompt}
      >
        <AlertDialog.Content
          title="Redirect to CivicDataSpace"
          primaryAction={{
            content: "Yes, continue",
            onAction: () => {
              setShowRedirectPrompt(false);
              if (externalUrl) {
                window.open(addOrganizationUrl, "_blank", "noopener,noreferrer");
              } else {
                router.push(addOrganizationUrl);
              }
            },
            className:
              "bg-primaryPurple2 hover:bg-[#6849EE] text-white hover:text-white",
          } as any}
          secondaryActions={[
            {
              content: "No",
              onAction: () => setShowRedirectPrompt(false),
              className:
                "bg-primaryPurple2 hover:bg-[#6849EE] text-white hover:text-white",
            } as any,
          ]}
        >
          You are being redirected to CivicDataSpace to add an organisation. Do
          you want to continue?
        </AlertDialog.Content>
      </AlertDialog>
    </>
  );
};

export default UserDashboard;
