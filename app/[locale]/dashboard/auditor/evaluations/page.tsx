"use client";

import { useGraphQL } from "@/lib/api";
import { useAppSession } from "@/lib/session";
import { IconEye, IconFilter, IconReportAnalytics } from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, Button, DataTable, Spinner, Text } from "opub-ui";
import { useEffect, useState } from "react";

// Types
type Evaluation = {
  id: string;
  name: string;
  status: string;
  auditType?: string;
  totalTests: number | null;
  passedTests: number | null;
  failedTests: number | null;
  skippedTests: number | null;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  modelId: string;
  modelName: string | null;
  modelVersionId?: number;
  requestedByName: string | null;
};

const GET_MY_EVALUATIONS = `
  query GetMyEvaluations($modelId: String, $status: String, $limit: Int) {
    myEvaluations(modelId: $modelId, status: $status, limit: $limit) {
      id
      name
      status
      totalTests
      passedTests
      failedTests
      skippedTests
      createdAt
      startedAt
      completedAt
      modelId
      modelName
    }
  }
`;

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700" },
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-700" },
  RUNNING: { bg: "bg-blue-100", text: "text-blue-700" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-700" },
  FAILED: { bg: "bg-red-100", text: "text-red-700" },
};

const auditTypeLabels: Record<string, string> = {
  TECHNICAL_AUDIT: "Technical",
  DOMAIN_AUDIT: "Domain",
  CULTURAL_AUDIT: "Cultural",
};

const statusOptions = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING" },
  { label: "Running", value: "RUNNING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Failed", value: "FAILED" },
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const EvaluationsPage = () => {
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale || "en";
  const { request, isAuthenticated, isLoading: isSessionLoading } = useGraphQL();
  const { user } = useAppSession();

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    if (!isAuthenticated || isSessionLoading) return;

    const fetchEvaluations = async () => {
      try {
        setLoading(true);
        setError(null);

        // No need to pass userId - backend uses logged-in user context
        const response = await request(GET_MY_EVALUATIONS, {
          limit: 100,
        });

        if (response?.myEvaluations) {
          setEvaluations(response.myEvaluations);
        }
      } catch (err: any) {
        console.error("Error fetching evaluations:", err);
        setError(err?.message || "Failed to load evaluations");
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [isAuthenticated, isSessionLoading, request]);

  // Filter evaluations by status
  const filteredEvaluations =
    statusFilter === "ALL"
      ? evaluations
      : evaluations.filter((e) => e.status === statusFilter);

  const columnHelper = createColumnHelper<Evaluation>();

  const columns = [
    columnHelper.accessor("name", {
      header: "Evaluation Name",
      cell: (info) => (
        <Link
          href={`/${locale}/dashboard/auditor/evaluations/${info.row.original.id}`}
          className="text-purple-600 hover:underline font-medium"
        >
          {info.getValue() || "Untitled Evaluation"}
        </Link>
      ),
    }),
    columnHelper.accessor("modelName", {
      header: "Model",
      cell: (info) => (
        <Text variant="bodySm">
          {info.getValue() || `Model ${info.row.original.modelId?.slice(0, 8) || "-"}`}
        </Text>
      ),
    }),
    columnHelper.accessor("auditType", {
      header: "Type",
      cell: (info) => {
        const typeValue = info.getValue();
        return (
          <Badge>
            {auditTypeLabels[typeValue || ""] || "Technical"}
          </Badge>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        const colors = statusColors[status] || statusColors.DRAFT;
        return (
          <span
            className={`px-2 py-1 text-xs rounded-full ${colors.bg} ${colors.text}`}
          >
            {status}
          </span>
        );
      },
    }),
    columnHelper.accessor("totalTests", {
      header: "Tests",
      cell: (info) => {
        const row = info.row.original;
        if (row.totalTests === null) {
          return <Text variant="bodySm">-</Text>;
        }
        return (
          <div className="flex items-center gap-2">
            <Text variant="bodySm">
              {row.passedTests || 0}/{row.totalTests}
            </Text>
            {row.totalTests > 0 && (
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${((row.passedTests || 0) / row.totalTests) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      cell: (info) => (
        <Text variant="bodySm">{formatDate(info.getValue())}</Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            kind="tertiary"
            size="slim"
            onClick={() =>
              router.push(
                `/${locale}/dashboard/auditor/evaluations/${row.original.id}`
              )
            }
          >
            <IconEye size={16} className="mr-1" />
            View
          </Button>
        </div>
      ),
    }),
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Spinner />
        <Text variant="bodySm" className="text-gray-600">
          Loading your evaluations...
        </Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Text variant="bodyMd" className="text-red-600 mb-4">
          {error}
        </Text>
        <Button kind="secondary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8 mt-10">
        <div>
          <Text variant="headingLg" as="h1" fontWeight="bold">
            My Evaluations
          </Text>
          <Text variant="bodySm" className="text-gray-600 mt-1">
            All evaluations you have conducted
          </Text>
        </div>
      </div>

      {/* Filter Section */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <IconFilter size={18} className="text-gray-500" />
          <Text variant="bodySm" fontWeight="medium">
            Filter by status:
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                statusFilter === option.value
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {option.label}
              {option.value !== "ALL" && (
                <span className="ml-1.5 text-xs">
                  ({evaluations.filter((e) => e.status === option.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Evaluations Table */}
      {filteredEvaluations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
          <IconReportAnalytics size={32} className="text-gray-400 mb-3" />
          <Text variant="bodyMd" className="text-gray-600">
            {statusFilter === "ALL"
              ? "No evaluations found"
              : `No ${statusFilter.toLowerCase()} evaluations`}
          </Text>
          <Text variant="bodySm" className="text-gray-500 mt-1">
            {statusFilter === "ALL"
              ? "Start evaluating AI models from your assignments"
              : "Try selecting a different filter"}
          </Text>
          {statusFilter === "ALL" && (
            <Link href={`/${locale}/dashboard/auditor`}>
              <Button kind="primary" className="mt-4">
                View Assignments
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <DataTable
            rows={filteredEvaluations}
            columns={columns}
            hoverable={true}
            hideSelection={true}
            hideFooter={filteredEvaluations.length <= 10}
          />
        </div>
      )}
    </>
  );
};

export default EvaluationsPage;
