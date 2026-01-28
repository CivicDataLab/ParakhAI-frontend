"use client";

import { useGraphQL } from "@/lib/api";
import { useAppSession } from "@/lib/session";
import {
  IconCheck,
  IconEye,
  IconFilter,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";
import { useParams, useRouter } from "next/navigation";
import { Badge, Button, DataTable, Text } from "opub-ui";
import { useEffect, useState } from "react";

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

const GET_MY_ASSIGNMENTS = `
  query GetMyAssignments($modelId: String, $status: String) {
    myAssignments(modelId: $modelId, status: $status) {
      id
      organizationId
      modelId
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

const statusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-700" },
  ACCEPTED: { bg: "bg-green-100", text: "text-green-700" },
  DECLINED: { bg: "bg-red-100", text: "text-red-700" },
  IN_PROGRESS: { bg: "bg-blue-100", text: "text-blue-700" },
  COMPLETED: { bg: "bg-purple-100", text: "text-purple-700" },
};

const statusOptions = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Declined", value: "DECLINED" },
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const AssignmentsPage = () => {
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale || "en";
  const { request, isAuthenticated, isLoading: isSessionLoading } = useGraphQL();
  const { user } = useAppSession();

  const [assignments, setAssignments] = useState<AuditorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });

  useEffect(() => {
    if (!isAuthenticated || isSessionLoading) return;

    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);

        // No need to pass userId - backend uses logged-in user context
        const response = await request(GET_MY_ASSIGNMENTS, {});

        if (response?.myAssignments) {
          setAssignments(response.myAssignments);
        }
      } catch (err: any) {
        console.error("Error fetching assignments:", err);
        setError(err?.message || "Failed to load assignments");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [isAuthenticated, isSessionLoading, request]);

  const handleUpdateStatus = async (
    assignmentId: string,
    newStatus: string
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
              : a
          )
        );

        setToast({
          show: true,
          message: `Assignment ${newStatus.toLowerCase()} successfully`,
          type: "success",
        });
      } else {
        setToast({
          show: true,
          message:
            response?.updateAuditorAssignmentStatus?.message ||
            "Failed to update status",
          type: "error",
        });
      }
    } catch (err: any) {
      setToast({
        show: true,
        message: err?.message || "Error updating status",
        type: "error",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartEvaluation = (assignment: AuditorAssignment) => {
    router.push(
      `/${locale}/dashboard/auditor/models/${assignment.modelId}?versionId=${assignment.modelVersionId}`
    );
  };

  const handleViewModel = (assignment: AuditorAssignment) => {
    router.push(`/${locale}/dashboard/auditor/models/${assignment.modelId}`);
  };

  // Filter assignments by status
  const filteredAssignments =
    statusFilter === "ALL"
      ? assignments
      : assignments.filter((a) => a.status === statusFilter);

  const columnHelper = createColumnHelper<AuditorAssignment>();

  const columns = [
    columnHelper.accessor("modelName", {
      header: "Model",
      cell: (info) => (
        <button
          onClick={() => handleViewModel(info.row.original)}
          className="text-purple-600 hover:underline font-medium text-left"
        >
          {info.getValue() || `Model ${info.row.original.modelId.slice(0, 8)}`}
        </button>
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
          {info.getValue() || info.row.original.organizationId.slice(0, 8)}
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
            {status.replace(/_/g, " ")}
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
      header: "Assigned On",
      cell: (info) => (
        <Text variant="bodySm">{formatDate(info.getValue())}</Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const status = row.original.status;

        if (status === "PENDING") {
          return (
            <div className="flex items-center gap-2">
              <Button
                kind="primary"
                size="slim"
                onClick={() => handleUpdateStatus(row.original.id, "ACCEPTED")}
                disabled={updatingId === row.original.id}
              >
                <IconCheck size={16} className="mr-1" />
                Accept
              </Button>
              <Button
                kind="tertiary"
                size="slim"
                onClick={() => handleUpdateStatus(row.original.id, "DECLINED")}
                disabled={updatingId === row.original.id}
              >
                <IconX size={16} className="mr-1" />
                Decline
              </Button>
            </div>
          );
        }

        if (status === "ACCEPTED" || status === "IN_PROGRESS") {
          return (
            <div className="flex items-center gap-2">
              <Button
                kind="primary"
                size="slim"
                onClick={() => handleStartEvaluation(row.original)}
              >
                <IconPlayerPlay size={16} className="mr-1" />
                {status === "IN_PROGRESS" ? "Continue" : "Start"}
              </Button>
              <Button
                kind="tertiary"
                size="slim"
                onClick={() => handleViewModel(row.original)}
              >
                <IconEye size={16} className="mr-1" />
                View
              </Button>
            </div>
          );
        }

        return (
          <Button
            kind="tertiary"
            size="slim"
            onClick={() => handleViewModel(row.original)}
          >
            <IconEye size={16} className="mr-1" />
            View
          </Button>
        );
      },
    }),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <Text variant="headingLg" as="h1" fontWeight="bold">
            My Assignments
          </Text>
          <Text variant="bodySm" className="text-gray-600 mt-1">
            All your audit assignments across organizations
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
                  ({assignments.filter((a) => a.status === option.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments Table */}
      {filteredAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
          <IconFilter size={32} className="text-gray-400 mb-3" />
          <Text variant="bodyMd" className="text-gray-600">
            {statusFilter === "ALL"
              ? "No assignments found"
              : `No ${statusFilter.toLowerCase().replace(/_/g, " ")} assignments`}
          </Text>
          <Text variant="bodySm" className="text-gray-500 mt-1">
            {statusFilter === "ALL"
              ? "You'll see your audit assignments here when organizations invite you"
              : "Try selecting a different filter"}
          </Text>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <DataTable
            rows={filteredAssignments}
            columns={columns}
            hoverable={true}
            hideSelection={true}
            hideFooter={filteredAssignments.length <= 10}
          />
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast({ ...toast, show: false })}
            className="ml-2 hover:opacity-80"
          >
            <IconX size={16} />
          </button>
        </div>
      )}
    </>
  );
};

export default AssignmentsPage;
