"use client";

import { useGraphQL } from "@/lib/api";
import { useAppSession } from "@/lib/session";
import { IconEye, IconReportAnalytics } from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { statusColors } from "@/lib/statusColors";
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
  evaluationMode: string;
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
      auditType
      evaluationMode
    }
  }
`;

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
  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();
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
        const response = await request(
          GET_MY_EVALUATIONS,
          {
            limit: 100,
          }
          // { userId: user?.id || "" }
        );

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
          {info.getValue() ||
            `Model ${info.row.original.modelId?.slice(0, 8) || "-"}`}
        </Text>
      ),
    }),
    columnHelper.accessor("auditType", {
      header: "Evaluation Type",
      cell: (info) => {
        const typeValue = info.getValue();
        console.log("typeValue", typeValue);
        return <Badge>{typeValue}</Badge>;
      },
    }),
    columnHelper.accessor("evaluationMode", {
      header: "Evaluation Mode",
      cell: (info) => {
        const evaluationMode = info.getValue();
        return <Text variant="bodySm">{evaluationMode}</Text>;
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
      header: "Test Result",
      cell: (info) => {
        const total = info.getValue();
        const row = info.row.original;
        const passed = row.passedTests;
        const failed = row.failedTests;

        if (!total || passed == null || failed == null) {
          return <Text variant="bodySm">--</Text>;
        }

        return (
          <div className="flex items-center gap-2">
            <div className="test-result-bar">
              <div
                className="test-result-pass"
                style={{ width: `${(passed / total) * 100}%` }}
              />
              <div
                className="test-result-fail"
                style={{ width: `${(failed / total) * 100}%` }}
              />
            </div>
            <Text variant="bodySm">
              {passed}/{total} passed
            </Text>
          </div>
        );
      },
    }),
    columnHelper.accessor("createdAt", {
      header: "Evaluated On",
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
            <div className="flex items-center justify-center gap-1">
              <IconEye size={16} className="mr-1" />
              <span className="pt-0.5">View</span>
            </div>
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
      <div className="flex items-center justify-between mb-8 mt-10 pl-1">
        <div>
          <Text variant="headingLg" as="h1" fontWeight="bold">
            Evaluations
          </Text>
          <Text variant="bodySm" className="text-gray-600 mt-1">
            All evaluations you have conducted
          </Text>
        </div>
      </div>

      {/* Filter Section - same as assignments page */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex flex-wrap gap-2 pl-1">
          {statusOptions.map((option) => (
            <Button
              kind="secondary"
              size="slim"
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                statusFilter === option.value
                  ? "bg-primaryPurple2 text-white"
                  : "bg-gray-100 text-gray-700 hover:primaryPurple2"
              }`}
            >
              {option.label}
              {option.value !== "ALL" && (
                <span className="ml-1.5 text-xs">
                  ({evaluations.filter((e) => e.status === option.value).length}
                  )
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Evaluations Table - same as assignments page */}
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
            <Link href={`/${locale}/dashboard/auditor`} className="mt-4">
              <Button kind="primary">View Assignments</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <DataTable
            rows={filteredEvaluations}
            columns={columns}
            truncate={true}
            hoverable={true}
            hideSelection={true}
            hideFooter={filteredEvaluations.length <= 10}
            sortColumns={["createdAt", "status", "auditType", "evaluationMode"]}
          />
        </div>
      )}
    </>
  );
};

export default EvaluationsPage;
