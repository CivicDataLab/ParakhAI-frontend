"use client";

import BreadCrumbs from "@/components/Breadcrumbs";
import { useGraphQL } from "@/lib/api";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, DataTable, ProgressBar, Tag, Text } from "opub-ui";
import { useEffect, useState } from "react";
import WelcomeSection from "../../../components/WelcomeSection";

const GET_ORG_DETAILS = `
  query GetOrgDetails($orgId: ID!) {
    organization(id: $orgId) {
      id
      name
      logoUrl
    }
  }
`;

// GraphQL query to fetch user's audits
const AUDITS_QUERY = `
  query GetAudits($status: String, $limit: Int) {
    audits(status: $status, limit: $limit) {
      id
      name
      modelId
      status
      modules
      metrics
      totalTests
      passedTests
      failedTests
      createdAt
      startedAt
      completedAt
    }
  }
`;

type Audit = {
  id: string;
  name: string;
  modelId: string;
  status: string;
  modules: string[];
  metrics: string[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

const AuditsListPage = () => {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || "en";
  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();

  const [audits, setAudits] = useState<Audit[]>([]);
  const [organization, setOrganization] = useState<{ name: string; logoUrl: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch audits on mount
  useEffect(() => {
    if (!isAuthenticated || isSessionLoading) return;

    const fetchAudits = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [auditsData, orgData] = await Promise.all([
          request<{ audits: Audit[] }>(AUDITS_QUERY, {
            status: null,
            limit: 100,
          }, { organization: params.orgId as string }),
          request(GET_ORG_DETAILS, { orgId: params.orgId })
        ]);

        setAudits(auditsData?.audits || []);
        if (orgData?.organization) {
          setOrganization(orgData.organization);
        }
      } catch (err: any) {
        console.error("Error fetching audits:", err);
        setError(err?.message || "Failed to load audits");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudits();
  }, [isAuthenticated, isSessionLoading, request]);

  // Column helper for DataTable
  const columnHelper = createColumnHelper<Audit>();

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status tag color
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return { fillColor: "#E2F5C4", textColor: "#166534" };
      case "RUNNING":
        return { fillColor: "#FEF3C7", textColor: "#92400E" };
      case "PENDING":
        return { fillColor: "#E0E7FF", textColor: "#3730A3" };
      case "FAILED":
      case "ERROR":
        return { fillColor: "#FEE2E2", textColor: "#DC2626" };
      default:
        return { fillColor: "#F3F4F6", textColor: "#374151" };
    }
  };

  // Define columns
  const columns = [
    columnHelper.accessor("name", {
      header: "Evaluation Name",
      cell: (info) => (
        <Link
          href={`/${locale}/dashboard/ai-maker/${params.orgId}/evaluations/${info.row.original.id}`}
          className="text-primary-purple hover:underline font-medium"
        >
          {info.getValue() || `Evaluation #${info.row.original.id.slice(0, 8)}`}
        </Link>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        const colors = getStatusColor(status);
        return (
          <Tag
            variation="filled"
            fillColor={colors.fillColor}
            textColor={colors.textColor}
          >
            {status || "Unknown"}
          </Tag>
        );
      },
    }),
    columnHelper.accessor("modules", {
      header: "Modules",
      cell: (info) => {
        const modules = info.getValue() || [];
        return (
          <Text variant="bodySm">
            {modules.length > 0 ? modules.join(", ") : "--"}
          </Text>
        );
      },
    }),
    columnHelper.accessor("totalTests", {
      header: "Tests",
      cell: (info) => {
        const total = info.getValue() || 0;
        const passed = info.row.original.passedTests || 0;
        const failed = info.row.original.failedTests || 0;

        if (total === 0) return <Text variant="bodySm">--</Text>;

        return (
          <div className="flex items-center gap-2">
            <Text variant="bodySm" className="text-green-600">
              {passed} passed
            </Text>
            <Text variant="bodySm" className="text-gray-400">
              /
            </Text>
            <Text variant="bodySm" className="text-red-600">
              {failed} failed
            </Text>
          </div>
        );
      },
    }),
    // columnHelper.accessor("overallScore", {
    //   header: "Score",
    //   cell: (info) => {
    //     const score = info.getValue();
    //     if (score === null || score === undefined)
    //       return <Text variant="bodySm">--</Text>;
    //     return (
    //       <Text variant="bodySm" fontWeight="semibold">
    //         {score.toFixed(1)}%
    //       </Text>
    //     );
    //   },
    // }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      cell: (info) => (
        <Text variant="bodySm">{formatDate(info.getValue())}</Text>
      ),
    }),
    columnHelper.accessor("completedAt", {
      header: "Completed",
      cell: (info) => (
        <Text variant="bodySm">{formatDate(info.getValue())}</Text>
      ),
    }),
  ];

  // Handle new audit button click
  const handleNewAudit = () => {
    router.push(`/${locale}/dashboard/ai-maker/${params.orgId}/evaluations/new`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-visible">
      <BreadCrumbs
        data={[
          { href: "/", label: "Home" },
          { href: "/dashboard", label: "User Dashboard" },
          { href: `/${locale}/dashboard/ai-maker`, label: "AI Maker" },
          { href: `/${locale}/dashboard/ai-maker/${params.orgId}`, label: organization?.name || "Dashboard" },
          { href: "#", label: "Evaluations" },
        ]}
      />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 overflow-x-visible">
        <div className="flex flex-1 flex-col lg:flex-row gap-6 md:gap-8 lg:-ml-[120px] xl:-ml-[130px]">
          <WelcomeSection orgName={organization?.name} orgLogo={organization?.logoUrl} />

          <div className="flex-1 bg-gray-50 p-4 sm:p-6 lg:p-10 mt-6 lg:mt-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <Text variant="headingLg" as="h1" fontWeight="bold">
                Evaluations
              </Text>
              <Button kind="secondary" onClick={handleNewAudit}>
                New Evaluation
              </Button>
            </div>

            {/* Content */}
            {isSessionLoading || isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <ProgressBar value={50} max={100} size="small" />
                <Text variant="bodySm" className="mt-4 text-gray-600">
                  Loading evaluations...
                </Text>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Text variant="bodySm" className="text-red-600 mb-4">
                  {error}
                </Text>
                <Button
                  kind="secondary"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            ) : audits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <img
                  src="/images/icons/mood-empty.png"
                  alt="No evaluations"
                  width={70}
                  height={70}
                  className="mb-4 opacity-60"
                />
                <Text
                  variant="bodyMd"
                  className="text-gray-600 mb-4 text-center"
                >
                  You haven&apos;t run any evaluations yet.
                  <br />
                  Start your first evaluation to see results here.
                </Text>
                <Button kind="primary" onClick={handleNewAudit}>
                  Start New Evaluation
                </Button>
              </div>
            ) : (
              <DataTable
                rows={audits}
                columns={columns}
                hoverable
                sortColumns={["name", "status", "createdAt", "completedAt"]}
                defaultSortDirection="desc"
                hideSelection
                truncate
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditsListPage;
