"use client";

import { useGraphQL } from "@/lib/api";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, DataTable, Spinner, Tag, Text } from "opub-ui";
import { useEffect, useState } from "react";
import { useOrganization } from "../OrganizationContext";
import ModelSelectionModal from "./components/ModelSelectionModal";

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
  const { organization } = useOrganization();

  const [audits, setAudits] = useState<Audit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch audits on mount
  useEffect(() => {
    if (!isAuthenticated || isSessionLoading) return;

    const fetchAudits = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const auditsData = await request<{ audits: Audit[] }>(
          AUDITS_QUERY,
          {
            status: null,
            limit: 100,
          },
          { organization: params.orgId as string }
        );

        setAudits(auditsData?.audits || []);
      } catch (err: any) {
        console.error("Error fetching audits:", err);
        setError(err?.message || "Failed to load audits");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudits();
  }, [isAuthenticated, isSessionLoading, request, params.orgId]);

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
      case "DRAFT":
        return { fillColor: "#FEF9C3", textColor: "#854D0E" };
      case "FAILED":
      case "ERROR":
        return { fillColor: "#FEE2E2", textColor: "#DC2626" };
      default:
        return { fillColor: "#F3F4F6", textColor: "#374151" };
    }
  };

  // Get the appropriate link for an audit based on its status
  const getAuditLink = (audit: Audit) => {
    if (audit.status?.toUpperCase() === "DRAFT") {
      return `/${locale}/dashboard/ai-maker/${params.orgId}/evaluations/new?auditId=${audit.id}`;
    }
    return `/${locale}/dashboard/ai-maker/${params.orgId}/evaluations/${audit.id}`;
  };

  // Define columns
  const columns = [
    columnHelper.accessor("name", {
      header: "Evaluation Name",
      cell: (info) => (
        <Link
          href={getAuditLink(info.row.original)}
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

  // Handle new audit button click - open modal
  const handleNewAudit = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-10">
        <Text variant="headingLg" as="h1" fontWeight="bold">
          Evaluations
        </Text>
        <Button kind="secondary" onClick={handleNewAudit} className="bg-[#6849EE] hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold text-base">
          New Evaluation
        </Button>
      </div>

      {/* Content */}
      {isSessionLoading || isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Spinner />
          <Text variant="bodySm" className="text-gray-600">
            Loading evaluations...
          </Text>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Text variant="bodySm" className="text-red-600 mb-4">
            {error}
          </Text>
          <Button kind="secondary" onClick={() => window.location.reload()}>
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
          <Text variant="bodyMd" className="text-gray-600 mb-4 text-center">
            You haven&apos;t run any evaluations yet.
            <br />
            Start your first evaluation to see results here.
          </Text>
          <Button kind="primary" onClick={handleNewAudit} className="bg-[#6849EE] hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold !font-bold text-base !text-base">
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

      {/* Model Selection Modal */}
      <ModelSelectionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        orgId={params.orgId as string}
      />
    </>
  );
};

export default AuditsListPage;
