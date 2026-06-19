"use client";

import { useGraphQL } from "@/lib/api";
import { useAppSession } from "@/lib/session";
import { statusColors } from "@/lib/statusColors";
import { formatAssignmentStatusLabel, formatStatusLabel } from "@/lib/utils";
import {
  IconCheck,
  IconClock,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, Button, DataTable, Spinner, Text, toast } from "opub-ui";
import { useEffect, useMemo, useState } from "react";
import ModelSelectionModal from "../ai-maker/[orgId]/evaluations/components/ModelSelectionModal";

// Types
type AuditorAssignment = {
  id: string;
  organizationId: string;
  organizationName?: string;
  modelId: string;
  modelName?: string;
  modelVersionId: number;
  versionLabel?: string;
  auditorId: number;
  auditorEmail: string;
  auditorUsername: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
};

const GET_AUDITOR_METRICS = `
  query AuditorMetrics {
    auditorMetrics {
      assignmentsCount
      assignmentsAccepted
      assignmentsDeclined
      assignmentsPending
      assignmentsCompleted
      auditsDone
      testCasesCount
      failedTestCasesCount
    }
  }
`;

const GET_MY_ASSIGNMENTS = `
  query GetMyAssignments($modelId: String, $status: String) {
    myAssignments(modelId: $modelId, status: $status) {
      id
      organizationId
      organizationName
      modelId
      modelName
      modelVersionId
      auditorId
      auditorEmail
      auditorUsername
      status
      notes
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_ASSIGNMENT_STATUS = `
  mutation UpdateAuditorAssignmentStatus($assignmentId: ID!, $status: String!) {
    updateAuditorAssignmentStatus(assignmentId: $assignmentId, status: $status) {
      success
      message
      assignment {
        id
        status
        notes
        updatedAt
      }
    }
  }
`;

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const AuditorDashboard = () => {
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale || "en";
  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();
  const { user } = useAppSession();

  const [assignments, setAssignments] = useState<AuditorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [auditorMetrics, setAuditorMetrics] = useState<{
    assignmentsCount: number;
    auditsDone: number;
    testCasesCount: number;
    failedTestCasesCount: number;
  } | null>(null);
  const [evaluationModalAssignment, setEvaluationModalAssignment] =
    useState<AuditorAssignment | null>(null);


  useEffect(() => {
    if (!isAuthenticated || isSessionLoading) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [assignmentsResponse, metricsResponse] = await Promise.all([
          request(GET_MY_ASSIGNMENTS, {}),
          request(GET_AUDITOR_METRICS, {}),
        ]);

        if (assignmentsResponse?.myAssignments) {
          setAssignments(assignmentsResponse.myAssignments);
        }

        if (metricsResponse?.auditorMetrics) {
          setAuditorMetrics(metricsResponse.auditorMetrics);
        }
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(err?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isSessionLoading, request]);

  const handleUpdateStatus = async (
    assignmentId: string,
    newStatus: string,
  ) => {
    try {
      setUpdatingId(assignmentId);

      const response = await request(UPDATE_ASSIGNMENT_STATUS, {
        assignmentId,
        status: newStatus,
      });

      if (response?.updateAuditorAssignmentStatus?.success) {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId
              ? {
                  ...a,
                  status: newStatus,
                  updatedAt:
                    response.updateAuditorAssignmentStatus.assignment.updatedAt,
                }
              : a,
          ),
        );

        toast.success(`Assignment ${newStatus.toLowerCase()} successfully`);
      } else {
        toast.error(
          response?.updateAuditorAssignmentStatus?.message ||
            "Failed to update status",
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Error updating status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartEvaluation = (assignment: AuditorAssignment) => {
    setEvaluationModalAssignment(assignment);
  };

  const preselectedModelForModal = useMemo(() => {
    if (!evaluationModalAssignment) return null;

    const assignment = evaluationModalAssignment;
    const versionLabel =
      assignment.versionLabel?.replace(/^v/i, "") ||
      String(assignment.modelVersionId);

    return {
      id: assignment.modelId,
      name: assignment.modelName || assignment.modelId,
      displayName: assignment.modelName || assignment.modelId,
      modelType: "",
      isPublic: true,
      versions: [
        {
          id: assignment.modelVersionId,
          version: versionLabel,
          isLatest: true,
          status: "ACTIVE",
        },
      ],
    };
  }, [evaluationModalAssignment]);

  const handleViewModel = (assignment: AuditorAssignment) => {
    router.push(`/${locale}/dashboard/auditor/models/${assignment.modelId}`);
  };

  // Filter assignments by status
  const pendingAssignments = assignments.filter((a) => a.status === "PENDING");
  const activeAssignments = assignments.filter(
    (a) => a.status === "ACCEPTED" || a.status === "IN_PROGRESS",
  );
  const completedAssignments = assignments.filter(
    (a) => a.status === "COMPLETED",
  );

  // Calculate metrics for Overview section
  const metrics = [
    {
      label: "Invitations Received",
      value: (auditorMetrics?.assignmentsCount ?? assignments.length).toString(),
    },
    {
      label: "Evaluations Completed",
      value: (auditorMetrics?.auditsDone ?? completedAssignments.length).toString(),
    },
    {
      label: "Test Cases Evaluated",
      value: (auditorMetrics?.testCasesCount ?? 0).toString(),
    },
    {
      label: "Issues Flagged",
      value: (auditorMetrics?.failedTestCasesCount ?? 0).toString(),
    },
  ];

  const columnHelper = createColumnHelper<AuditorAssignment>();

  const pendingColumns = [
    columnHelper.accessor("modelName", {
      header: "Model",
      cell: (info) => (
        <Link
          href={`/${locale}/dashboard/auditor/models/${info.row.original.modelId}`}
          className="text-baseGraySlateSolid12 hover:underline font-medium"
        >
          {info.getValue() || `Model ${info.row.original.modelId.slice(0, 8)}`}
        </Link>
      ),
    }),
    columnHelper.accessor("versionLabel", {
      header: "Version",
      cell: (info) => (
        <Badge>
          {info.getValue() || `v${info.row.original.modelVersionId}`}
        </Badge>
      ),
    }),
    columnHelper.accessor("organizationName", {
      header: "Organization",
      cell: (info) => (
        <Text variant="bodySm">
          {info.getValue() || `ID #${info.row.original.organizationId.slice(0, 8)}`}
        </Text>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        const colors = statusColors[status] || statusColors.PENDING;
        return (
          <span
            className={`px-2 py-1 text-xs rounded-full ${colors.bg} ${colors.text}`}
          >
            {formatAssignmentStatusLabel(status)}
          </span>
        );
      },
    }),
    columnHelper.accessor("notes", {
      header: "Notes",
      cell: (info) => (
        <Text variant="bodySm" className="text-gray-600 max-w-xs truncate">
          {info.getValue() || "-"}
        </Text>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Invited On",
      cell: (info) => (
        <Text variant="bodySm">{formatDate(info.getValue())}</Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 whitespace-nowrap min-w-[170px]">
          <Button
            kind="tertiary"
            size="slim"
            className="!text-baseGraySlateSolid12"
            onClick={() => handleUpdateStatus(row.original.id, "ACCEPTED")}
            disabled={updatingId === row.original.id}
          >
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <IconCheck color="#11181C" size={16} />
              <span className="text-baseGraySlateSolid12">Accept</span>
            </div>
          </Button>
          <Button
            kind="tertiary"
            size="slim"
            className="!text-baseGraySlateSolid12"
            onClick={() => handleUpdateStatus(row.original.id, "DECLINED")}
            disabled={updatingId === row.original.id}
          >
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <IconX color="#11181C" size={16} />
              <span className="text-baseGraySlateSolid12">Decline</span>
            </div>
          </Button>
        </div>
      ),
    }),
  ];

  const activeColumns = [
    columnHelper.accessor("modelName", {
      header: "Model",
      cell: (info) => (
        <Link
          href={`/${locale}/dashboard/auditor/models/${info.row.original.modelId}`}
          className="text-baseGraySlateSolid12 hover:underline font-medium"
        >
          {info.getValue() || info.row.original.modelName}
        </Link>
      ),
    }),
    columnHelper.accessor("versionLabel", {
      header: "Version",
      cell: (info) => (
        <Badge>
          {info.getValue() || `v${info.row.original.modelVersionId}`}
        </Badge>
      ),
    }),
    columnHelper.accessor("organizationName", {
      header: "Organization",
      cell: (info) => (
        <Text variant="bodySm">
          {info.getValue() || `ID #${info.row.original.organizationId.slice(0, 8)}`}
        </Text>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        const colors = statusColors[status] || statusColors.PENDING;
        return (
          <span
            className={`px-2 py-1 text-xs rounded-full ${colors.bg} ${colors.text}`}
          >
            {formatStatusLabel(status)}
          </span>
        );
      },
    }),
    columnHelper.accessor("createdAt", {
      header: "Assigned On",
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
            className="!text-baseGraySlateSolid12"
            onClick={() => handleStartEvaluation(row.original)}
          >
            <div className="flex items-center justify-center gap-1 text-baseGraySlateSolid12">
              <IconPlayerPlay size={16} className="mr-1 text-baseGraySlateSolid12" />
              <span className="pt-0.5 text-baseGraySlateSolid12">
                {row.original.status === "IN_PROGRESS"
                  ? "Continue"
                  : "Start Evaluation"}
              </span>
            </div>
          </Button>
          {/* <Button
            kind="tertiary"
            size="slim"
            className="!text-baseGraySlateSolid12"
            onClick={() => handleViewModel(row.original)}
          >
            <div className="flex items-center justify-center gap-1 text-baseGraySlateSolid12">
              <IconEye size={16} className="mr-1 text-baseGraySlateSolid12" />
              <span className="pt-0.5 text-baseGraySlateSolid12">View</span>
            </div>
          </Button> */}
        </div>
      ),
    }),
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Spinner />
        <Text variant="bodySm" className="text-gray-600">
          Loading your assignments...
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
      {/* Header with Title */}
      <div className="flex items-center justify-between mb-6 mt-10">
        <div>
          <h1 className="text-gray-900 overview-heading">Overview</h1>
          <Text variant="bodySm" className="text-gray-600 mt-1">
            Track your evaluation invitations, assignments, and activity
          </Text>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 sm:mb-10 lg:mb-12">
        {metrics.map((m) => (
          <div key={m.label} className="metric-card">
            <p className="metric-card-label">{m.label}</p>
            <p className="metric-card-value">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Dashboard Header */}
      {/* <div className="flex items-center justify-between mb-8">
        <div>
          <Text variant="headingLg" as="h1" fontWeight="bold">
            Evaluator Dashboard
          </Text>
          <Text variant="bodySm" className="text-gray-600 mt-1">
            Manage your evaluation assignments and evaluations
          </Text>
        </div>
      </div> */}

      {/* Pending Invitations Section */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          {/* <IconClock size={24} className="text-yellow-600" /> */}
          <Text
            variant="headingMd"
            fontWeight="bold"
            className="text-[20px] leading-[26px] text-[#1C2024]"
          >
            Pending Invitations
          </Text>
          {/* {pendingAssignments.length > 0 && (
            <Badge status="attention">
              {String(pendingAssignments.length)}
            </Badge>
          )} */}
        </div>

        {pendingAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-gray-200">
            <IconClock size={32} className="text-gray-400 mb-3" />
            <Text variant="bodyMd" className="text-gray-600">
              No pending invitations
            </Text>
            <Text variant="bodySm" className="text-gray-500 mt-1">
              You&apos;ll see new evaluation invitations here when organizations
              invite you
            </Text>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <DataTable
              rows={pendingAssignments}
              columns={pendingColumns}
              hoverable={true}
              hideSelection={true}
              truncate={false}
              hideFooter={pendingAssignments.length <= 10}
            />
          </div>
        )}
      </div>

      {/* Active Assignments Section */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          {/* <IconPlayerPlay size={24} className="text-green-600" /> */}
          <Text
            variant="headingMd"
            fontWeight="bold"
            className="text-[20px] leading-[26px] text-[#1C2024]"
          >
            Active Assignments
          </Text>
          {/* {activeAssignments.length > 0 && (
            <Badge status="success">{String(activeAssignments.length)}</Badge>
          )} */}
        </div>

        {activeAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-gray-200">
            <IconPlayerPlay size={32} className="text-gray-400 mb-3" />
            <Text variant="bodyMd" className="text-gray-600">
              No active assignments
            </Text>
            <Text variant="bodySm" className="text-gray-500 mt-1">
              Accept pending invitations to start evaluating AI models
            </Text>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <DataTable
              rows={activeAssignments}
              columns={activeColumns}
              hoverable={true}
              hideSelection={true}
              hideFooter={activeAssignments.length <= 10}
            />
          </div>
        )}
      </div>

      {evaluationModalAssignment && (
        <ModelSelectionModal
          open={!!evaluationModalAssignment}
          onOpenChange={(open) => {
            if (!open) {
              setEvaluationModalAssignment(null);
            }
          }}
          orgId={evaluationModalAssignment.organizationId}
          preselectedModelId={evaluationModalAssignment.modelId}
          preselectedVersionId={evaluationModalAssignment.modelVersionId}
          preselectedModel={preselectedModelForModal}
          lockModelSelection
          variant="auditor"
        />
      )}
    </>
  );
};

export default AuditorDashboard;
