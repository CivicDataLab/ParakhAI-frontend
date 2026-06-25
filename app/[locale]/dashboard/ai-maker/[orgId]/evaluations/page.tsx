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
import { useCallback, useEffect, useRef, useState } from "react";
import { useOrganization } from "../OrganizationContext";
import ModelSelectionModal from "./components/ModelSelectionModal";
import "./evaluations-page.css";

// Full fetch — used on initial load
const AUDITS_QUERY = `
  query GetAudits($limit: Int, $offset: Int, $filters: [FilterSpec!]) {
    audits(limit: $limit, offset: $offset, filters: $filters, sortOptions: null) {
      data {
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

// Lightweight poll — only id, name, status, and completedAt for non-terminal evaluations
const AUDITS_STATUS_POLL_QUERY = `
  query GetAudits($limit: Int, $offset: Int, $filters: [FilterSpec!]) {
    audits(limit: $limit, offset: $offset, filters: $filters, sortOptions: null) {
      data {
        id
        name
        status
        completedAt
      }
    }
  }
`;

const ACTIVE_AUDIT_STATUSES = [
  "QUEUED",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "DRAFT",
  "RUNNING",
] as const;

const ACTIVE_STATUS_FILTER = {
  field: "status",
  condition: "in",
  value: ACTIVE_AUDIT_STATUSES.join(","),
};

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

type AuditStatusUpdate = {
  id: string;
  name: string;
  status: string;
  completedAt: string | null;
};

const isActiveAuditStatus = (status?: string | null) =>
  ACTIVE_AUDIT_STATUSES.includes(
    (status?.toUpperCase() ?? "") as (typeof ACTIVE_AUDIT_STATUSES)[number],
  );

const hasActiveAudits = (items: Array<{ status?: string | null }>) =>
  items.some((audit) => isActiveAuditStatus(audit.status));

const mergeAuditStatusUpdates = (
  current: Audit[],
  updates: AuditStatusUpdate[],
): Audit[] => {
  if (updates.length === 0) return current;

  const updateById = new Map(updates.map((update) => [update.id, update]));
  const next = [...current];

  for (let i = 0; i < next.length; i++) {
    const update = updateById.get(next[i].id);
    if (update) {
      next[i] = {
        ...next[i],
        id: update.id,
        name: update.name,
        status: update.status,
        completedAt: update.completedAt,
      };
    }
  }

  return next;
};

const auditTypeLabels: Record<string, string> = {
  TECHNICAL_AUDIT: "Technical",
  DOMAIN_AUDIT: "Domain",
  CULTURAL_AUDIT: "Cultural",
};

const AuditsListPage = () => {
  const params = useParams();
  const locale = params.locale || "en";
  const orgId = params.orgId as string;
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
  const [shouldPoll, setShouldPoll] = useState(false);

  const requestRef = useRef(request);
  const orgIdRef = useRef(orgId);
  const auditsRef = useRef(audits);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

  useEffect(() => {
    auditsRef.current = audits;
  }, [audits]);

  const fetchAudits = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }
      setError(null);

      const auditsData = await requestRef.current<{
        audits: { data: Audit[]; totalItemsCount: number };
      }>(
        AUDITS_QUERY,
        {
          limit: 100,
          offset: 0,
          filters: null,
        },
        { organization: orgIdRef.current },
      );

      const nextAudits = auditsData?.audits?.data ?? [];
      setAudits(nextAudits);
      return hasActiveAudits(nextAudits);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load audits";
      console.error("Error fetching audits:", err);
      setError(message);
      return hasActiveAudits(auditsRef.current);
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, []);

  const pollAuditStatuses = useCallback(async () => {
    try {
      const auditsData = await requestRef.current<{
        audits: { data: AuditStatusUpdate[] };
      }>(
        AUDITS_STATUS_POLL_QUERY,
        {
          limit: 100,
          offset: 0,
          filters: ACTIVE_STATUS_FILTER,
        },
        { organization: orgIdRef.current },
      );

      const statusUpdates = auditsData?.audits?.data ?? [];
      const polledIds = new Set(statusUpdates.map((update) => update.id));
      const missingActiveIds = auditsRef.current
        .filter((audit) => isActiveAuditStatus(audit.status))
        .filter((audit) => !polledIds.has(audit.id));

      if (missingActiveIds.length > 0) {
        return fetchAudits(false);
      }

      if (statusUpdates.length === 0) {
        return hasActiveAudits(auditsRef.current);
      }

      const nextAudits = mergeAuditStatusUpdates(
        auditsRef.current,
        statusUpdates,
      );
      setAudits(nextAudits);
      return hasActiveAudits(nextAudits);
    } catch (err) {
      console.error("Polling error:", err);
      return hasActiveAudits(auditsRef.current);
    }
  }, [fetchAudits]);

  // Initial full fetch
  useEffect(() => {
    if (!isAuthenticated || isSessionLoading) return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    const isInitialLoad = !hasFetchedRef.current;

    const loadAudits = async () => {
      try {
        const hasActive = await fetchAudits(isInitialLoad);
        hasFetchedRef.current = true;
        setShouldPoll(hasActive);
      } finally {
        isFetchingRef.current = false;
      }
    };

    void loadAudits();
  }, [isAuthenticated, isSessionLoading, orgId, fetchAudits]);

  // Poll only id/name/status for non-terminal evaluations
  useEffect(() => {
    if (!shouldPoll || !isAuthenticated) return;

    const pollInterval = window.setInterval(() => {
      void pollAuditStatuses().then((hasActive) => {
        if (!hasActive) {
          setShouldPoll(false);
        }
      });
    }, 15000);

    const pollTimeout = window.setTimeout(() => {
      setShouldPoll(false);
    }, 300000);

    return () => {
      window.clearInterval(pollInterval);
      window.clearTimeout(pollTimeout);
    };
  }, [shouldPoll, isAuthenticated, pollAuditStatuses]);

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
