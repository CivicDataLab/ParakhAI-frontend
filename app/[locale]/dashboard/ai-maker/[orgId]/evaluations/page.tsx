"use client";

import {
  EVALUATION_STATUS_FILTER_OPTIONS,
  StatusFilterTabs,
} from "@/app/[locale]/dashboard/components/StatusFilterTabs";
import { useGraphQL } from "@/lib/api";
import { getEvaluationStatusColor } from "@/lib/statusColors";
import { formatStatusLabel } from "@/lib/utils";
import { createColumnHelper } from "@tanstack/react-table";
import { IconReportAnalytics } from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, DataTable, Spinner, Text } from "opub-ui";
import { useEffect, useRef, useState } from "react";
import { useOrganization } from "../OrganizationContext";
import ModelSelectionModal from "./components/ModelSelectionModal";
import "./evaluations-page.css";

// GraphQL query to fetch user's audits
const AUDITS_QUERY = `
  query GetAudits($limit: Int, $offset: Int) {
    audits(limit: $limit, offset: $offset, filters: null, sortOptions: null) {
      data{
      id
      name
      modelId
      modelName
      status
      modules
      metrics
      evaluationMode
      auditType
      totalTests
      passedTests
      failedTests
      createdAt
      startedAt
      completedAt
    }
    totalItemsCount
  }
}
`;

type Audit = {
  id: string;
  name: string;
  modelId: string;
  modelName: string | null;
  status: string;
  modules: string[];
  metrics: string[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  evaluationMode: string;
  auditType: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

const auditTypeLabels: Record<string, string> = {
  TECHNICAL_AUDIT: "Technical",
  DOMAIN_AUDIT: "Domain",
  CULTURAL_AUDIT: "Cultural",
};

const AuditsListPage = () => {
  const params = useParams();
  const locale = params.locale || "en";
  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();
  useOrganization();

  const [audits, setAudits] = useState<Audit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const pollStoppedRef = useRef(false);

  const fetchAudits = async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }
      setError(null);

      const auditsData = await request<{ audits: { data: Audit[], totalItemsCount: number } }>(
        AUDITS_QUERY,
        {
          status: null,
          limit: 100,
        },
        { organization: params.orgId as string }
      );

      const nextAudits = auditsData?.audits?.data || [];
      setAudits(nextAudits);

      const hasActiveAudits = nextAudits.some((audit) => {
        const status = audit.status?.toUpperCase();
        return (
          status === "QUEUED" ||
          status === "PENDING" ||
          status === "RUNNING"
        );
      });

      return hasActiveAudits;
    } catch (err: any) {
      console.error("Error fetching audits:", err);
      setError(err?.message || "Failed to load audits");
      return false;
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  const startPolling = () => {
    const pollInterval = 15000;
    const maxPollTime = 300000;
    const startTime = Date.now();

    const poll = async () => {
      if (pollStoppedRef.current) return;
      if (Date.now() - startTime > maxPollTime) return;

      try {
        const hasActiveAudits = await fetchAudits(false);
        if (!hasActiveAudits) return;
      } catch (err) {
        console.error("Polling error:", err);
      }

      setTimeout(poll, pollInterval);
    };

    setTimeout(poll, pollInterval);
  };

  // Stop polling when component unmounts
  useEffect(() => {
    return () => {
      pollStoppedRef.current = true;
    };
  }, []);

  // Fetch audits on mount
  useEffect(() => {
    if (!isAuthenticated || isSessionLoading) return;
    if (isFetchingRef.current || hasFetchedRef.current) return;

    isFetchingRef.current = true;

    const loadAudits = async () => {
      const hasActiveAudits = await fetchAudits(true);
      hasFetchedRef.current = true;

      if (hasActiveAudits) {
        startPolling();
      }
    };

    loadAudits();
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

  // Get the appropriate link for an audit based on its status
  const getAuditLink = (audit: Audit) => {
    if (audit.status?.toUpperCase() === "DRAFT") {
      return `/${locale}/dashboard/ai-maker/${params.orgId}/evaluations/new?auditId=${audit.id}`;
    }
    if (
      audit.status?.toUpperCase() === "IN_PROGRESS" &&
      (audit.evaluationMode?.toLowerCase() === "manual" ||
        audit.evaluationMode?.toLowerCase() === "playground")
    ) {
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
        const label = typeValue
          ? auditTypeLabels[typeValue] || typeValue
          : "--";
        return <Badge>{label}</Badge>;
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        const colors = getEvaluationStatusColor(status);
        return (
          <Text
            variant="bodySm"
            as="span"
            className="inline-block rounded px-2 py-0.5"
            style={{
              backgroundColor: colors.fillColor,
              color: colors.textColor,
            }}
          >
            {formatStatusLabel(status)}
          </Text>
        );
      },
    }),
    // columnHelper.accessor("modules", {
    //   header: "Modules",
    //   cell: (info) => {
    //     const modules = info.getValue() || [];
    //     return (
    //       <Text variant="bodySm">
    //         {modules.length > 0 ? modules.join(", ") : "--"}
    //       </Text>
    //     );
    //   },
    // }),
    columnHelper.accessor("evaluationMode", {
      header: "Evaluation Mode",
      cell: (info) => {
        const mode = info.getValue()?.toLowerCase();
        const label =
          mode === "manual" || mode === "playground"
            ? "Playground Evaluation"
            : mode === "bulk" || mode === "automated"
              ? "Bulk Evaluation"
              : info.getValue() || "--";
        return <Text variant="bodySm">{label}</Text>;
      },
    }),
    columnHelper.accessor("totalTests", {
      header: "Tests",
      cell: (info) => {
        const total = info.getValue() || 0;
        const passed = info.row.original.passedTests || 0;
        const failed = info.row.original.failedTests || 0;

        // if (total === 0) return <Text variant="bodySm">--</Text>;
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
    // columnHelper.accessor("createdAt", {
    //   header: "Created",
    //   cell: (info) => (
    //     <Text variant="bodySm">{formatDate(info.getValue())}</Text>
    //   ),
    // }),
    columnHelper.accessor("completedAt", {
      header: "Completed on",
      cell: (info) => (
        <Text variant="bodySm">{formatDate(info.getValue())}</Text>
      ),
    }),
  ];

  const filteredAudits =
    statusFilter === "ALL"
      ? audits
      : audits.filter(
          (audit) => audit.status?.toUpperCase() === statusFilter
        );

  // Handle new audit button click - open modal
  const handleNewAudit = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-10">
        <div>
          <Text variant="headingLg" as="h1" fontWeight="bold">
            Evaluations
          </Text>
          <Text variant="bodySm" className="text-gray-600 mt-1">
            Create and manage evaluation runs to assess your AI models
          </Text>
        </div>
        <Button
          kind="secondary"
          onClick={handleNewAudit}
          className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold text-base"
        >
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
          <Button
            kind="primary"
            onClick={handleNewAudit}
            className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold !font-bold text-base !text-base"
          >
            Start New Evaluation
          </Button>
        </div>
      ) : (
        <>
          <StatusFilterTabs
            options={EVALUATION_STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            items={audits}
          />

          {filteredAudits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
              <IconReportAnalytics size={32} className="text-gray-400 mb-3" />
              <Text variant="bodyMd" className="text-gray-600">
                {`No ${formatStatusLabel(statusFilter, { lowercase: true })} evaluations`}
              </Text>
              <Text variant="bodySm" className="text-gray-500 mt-1">
                Try selecting a different filter
              </Text>
            </div>
          ) : (
            <div className="evaluations-table-evaluation-mode-col">
              <DataTable
                rows={filteredAudits}
                columns={columns}
                hoverable
                sortColumns={[
                  "name",
                  "modelName",
                  "auditType",
                  "status",
                  "evaluationMode",
                  "completedAt",
                ]}
                initialSortColumnIndex={7}
                defaultSortDirection="desc"
                hideSelection
                truncate
              />
            </div>
          )}
        </>
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
