"use client";

import { useGraphQL } from "@/lib/api";
import { IconPlus, IconSearch, IconUser, IconUserCheck, IconX } from "@tabler/icons-react";
import { Button, Dialog, Text } from "opub-ui";
import { useEffect, useState } from "react";

// Types
type Auditor = {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePicture: string | null;
  joinedAt: string | null;
};

type AuditorAssignment = {
  id: string;
  organizationId: string;
  modelId: string;
  modelVersionId: number;
  auditorUserId: string;
  auditorEmail: string;
  auditorUsername: string;
  status: string;
  notes: string;
  createdAt: string;
};

type SearchUserResult = {
  found: boolean;
  message?: string;
  user?: Auditor;
};

interface AuditorInvitationProps {
  organizationId: string;
  modelId: string;
  modelVersionId: number;
  onAssignmentCreated?: (assignment: AuditorAssignment) => void;
  isOpen?: boolean;
  onClose?: () => void;
  versionLabel?: string;
}

// GraphQL Queries
const GET_ORGANIZATION_AUDITORS = `
  query GetOrganizationAuditors($organizationId: ID!) {
    organizationAuditors(organizationId: $organizationId) {
      organizationId
      organizationName
      auditors {
        id
        username
        email
        firstName
        lastName
        profilePicture
        joinedAt
      }
      count
    }
  }
`;

const GET_AUDITOR_ASSIGNMENTS = `
  query GetAuditorAssignments($modelId: String, $modelVersionId: Int) {
    auditorAssignments(modelId: $modelId, modelVersionId: $modelVersionId) {
      id
      organizationId
      modelId
      modelVersionId
      auditorUserId
      auditorEmail
      auditorUsername
      status
      notes
      createdAt
    }
  }
`;

const SEARCH_USER_BY_EMAIL = `
  query SearchUserByEmail($email: String!) {
    searchUserByEmail(email: $email) {
      found
      message
      user {
        id
        username
        email
        firstName
        lastName
        profilePicture
      }
    }
  }
`;

const ADD_AUDITOR_MUTATION = `
  mutation AddAuditorToOrganization($organizationId: ID!, $input: AddAuditorInput!) {
    addAuditorToOrganization(organizationId: $organizationId, input: $input) {
      success
      message
      auditor {
        id
        username
        email
        firstName
        lastName
      }
    }
  }
`;

const ASSIGN_AUDITOR_TO_VERSION = `
  mutation AssignAuditorToVersion($input: AssignAuditorToVersionInput!) {
    assignAuditorToVersion(input: $input) {
      success
      message
      assignment {
        id
        organizationId
        modelId
        modelVersionId
        auditorUserId
        auditorEmail
        auditorUsername
        status
        createdAt
      }
    }
  }
`;

const AuditorInvitation: React.FC<AuditorInvitationProps> = ({
  organizationId,
  modelId,
  modelVersionId,
  onAssignmentCreated,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  versionLabel,
}) => {
  const { request } = useGraphQL();

  const isControlled = externalIsOpen !== undefined;

  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [assignments, setAssignments] = useState<AuditorAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  const isModalOpen = isControlled ? externalIsOpen : internalIsOpen;
  const setIsModalOpen = isControlled 
    ? (open: boolean) => { if (!open && externalOnClose) externalOnClose(); }
    : setInternalIsOpen;
  const [selectedAuditorId, setSelectedAuditorId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [showAddNew, setShowAddNew] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [searchResult, setSearchResult] = useState<SearchUserResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [auditorsResponse, assignmentsResponse] = await Promise.all([
          request(
            GET_ORGANIZATION_AUDITORS,
            { organizationId },
            { organization: organizationId }
          ),
          request(
            GET_AUDITOR_ASSIGNMENTS,
            { modelId, modelVersionId },
            { organization: organizationId }
          ),
        ]);

        if (auditorsResponse?.organizationAuditors) {
          setAuditors(auditorsResponse.organizationAuditors.auditors || []);
        }

        if (assignmentsResponse?.auditorAssignments) {
          setAssignments(assignmentsResponse.auditorAssignments || []);
        }
      } catch (err) {
        console.error("Error fetching auditor data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (organizationId && modelId && modelVersionId && isModalOpen) {
      fetchData();
    }
  }, [organizationId, modelId, modelVersionId, request, isModalOpen]);

  const availableAuditors = auditors.filter(
    (auditor) => !assignments.some((a) => a.auditorUserId === auditor.id)
  );

  const handleSearchUser = async () => {
    if (!emailInput.trim()) return;

    try {
      setIsSearching(true);
      setSearchResult(null);

      const response = await request(
        SEARCH_USER_BY_EMAIL,
        { email: emailInput.trim() },
        { organization: organizationId }
      );

      if (response?.searchUserByEmail) {
        setSearchResult(response.searchUserByEmail);
      }
    } catch (err: any) {
      setSearchResult({
        found: false,
        message: err?.message || "Error searching for user",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddNewAuditor = async () => {
    if (!searchResult?.user) return;

    try {
      setIsAddingNew(true);

      const existingAuditor = auditors.find(a => a.id === searchResult.user?.id || a.email === searchResult.user?.email);
      
      if (existingAuditor) {
        await handleAssignAuditor(existingAuditor.id, existingAuditor.email, existingAuditor.username);
        setShowAddNew(false);
        setEmailInput("");
        setSearchResult(null);
        return;
      }

      const addResponse = await request(
        ADD_AUDITOR_MUTATION,
        {
          organizationId,
          input: { email: searchResult.user.email },
        },
        { organization: organizationId }
      );

      if (addResponse?.addAuditorToOrganization?.success) {
        const auditorsResponse = await request(
          GET_ORGANIZATION_AUDITORS,
          { organizationId },
          { organization: organizationId }
        );

        if (auditorsResponse?.organizationAuditors) {
          setAuditors(auditorsResponse.organizationAuditors.auditors || []);
        }

        await handleAssignAuditor(searchResult.user.id, searchResult.user.email, searchResult.user.username);

        setShowAddNew(false);
        setEmailInput("");
        setSearchResult(null);
      } else {
        const errorMessage = addResponse?.addAuditorToOrganization?.message || "";
        if (errorMessage.includes("already") && errorMessage.includes("member")) {
          setToast({
            show: true,
            message: "This user is already a member of the organization with a different role. They need to be added as an auditor first.",
            type: "error",
          });
        } else {
          setToast({
            show: true,
            message: errorMessage || "Failed to add auditor",
            type: "error",
          });
        }
      }
    } catch (err: any) {
      setToast({
        show: true,
        message: err?.message || "Error adding auditor",
        type: "error",
      });
    } finally {
      setIsAddingNew(false);
    }
  };

  const handleAssignAuditor = async (
    auditorId?: string,
    auditorEmail?: string,
    auditorUsername?: string
  ) => {
    const targetAuditorId = auditorId || selectedAuditorId;
    if (!targetAuditorId) return;

    const auditor = auditors.find((a) => a.id === targetAuditorId);
    const email = auditorEmail || auditor?.email || "";
    const username = auditorUsername || auditor?.username || "";

    try {
      setIsAssigning(true);

      const response = await request(
        ASSIGN_AUDITOR_TO_VERSION,
        {
          input: {
            modelId,
            modelVersionId,
            auditorUserId: targetAuditorId,
            auditorEmail: email,
            auditorUsername: username,
            notes,
          },
        },
        { organization: organizationId }
      );

      if (response?.assignAuditorToVersion?.success) {
        const newAssignment = response.assignAuditorToVersion.assignment;
        setAssignments((prev) => [...prev, newAssignment]);

        if (onAssignmentCreated) {
          onAssignmentCreated(newAssignment);
        }

        setToast({
          show: true,
          message: "Auditor assigned successfully",
          type: "success",
        });

        setIsModalOpen(false);
        setSelectedAuditorId("");
        setNotes("");
      } else {
        setToast({
          show: true,
          message: response?.assignAuditorToVersion?.message || "Failed to assign auditor",
          type: "error",
        });
      }
    } catch (err: any) {
      setToast({
        show: true,
        message: err?.message || "Error assigning auditor",
        type: "error",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const auditorOptions = [
    { label: "Select an auditor...", value: "" },
    ...availableAuditors.map((auditor) => {
      const displayName = auditor.firstName && auditor.lastName
        ? `${auditor.firstName} ${auditor.lastName}`
        : auditor.username !== auditor.email
          ? auditor.username
          : auditor.email.split('@')[0];
      return {
        label: `${displayName} (${auditor.email})`,
        value: auditor.id,
      };
    }),
  ];

  const toastNotification = toast.show && (
    <div
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
        toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
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
  );

  const inviteDialog = (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <Dialog.Content
        title={versionLabel ? `Invite Auditor for Version ${versionLabel}` : "Invite Auditor"}
        footer={<></>}
        primaryAction={{
          content: showAddNew
            ? isAddingNew ? "Adding..." : "Add & Assign Auditor"
            : isAssigning ? "Assigning..." : "Assign Auditor",
          onAction: showAddNew ? handleAddNewAuditor : () => handleAssignAuditor(),
          disabled: showAddNew
            ? !searchResult?.found || isAddingNew
            : !selectedAuditorId || isAssigning,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => {
              setIsModalOpen(false);
              setSelectedAuditorId("");
              setNotes("");
              setShowAddNew(false);
              setEmailInput("");
              setSearchResult(null);
            },
          },
        ]}
      >
        <div className="space-y-4">
          {!showAddNew ? (
            <>
              <Text variant="bodySm" className="text-gray-600">
                Select an auditor from your organization to assign to this model version.
              </Text>

              {loading ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <Text variant="bodySm" className="text-gray-600">
                    Loading auditors...
                  </Text>
                </div>
              ) : availableAuditors.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Auditor
                  </label>
                  <select
                    value={selectedAuditorId}
                    onChange={(e) => setSelectedAuditorId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {auditorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Text variant="bodySm" className="text-yellow-800">
                    No available auditors. All auditors are already assigned or you need to add new auditors to your organization.
                  </Text>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes for the auditor..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="pt-2 border-t">
                <Button
                  kind="tertiary"
                  onClick={() => setShowAddNew(true)}
                >
                  Can&apos;t find the auditor? Add by email
                </Button>
              </div>
            </>
          ) : (
            <>
              <Text variant="bodySm" className="text-gray-600">
                Search for a user by email. If found, they will be added as an auditor
                to your organization and assigned to this model version.
              </Text>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="auditor@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    kind="secondary"
                    onClick={handleSearchUser}
                    disabled={!emailInput.trim() || isSearching}
                  >
                    <IconSearch size={18} className="mr-1" />
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>

              {/* Search Result */}
              {searchResult && (
                <div
                  className={`p-4 rounded-lg ${
                    searchResult.found
                      ? "bg-green-50 border-2 border-green-400"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {searchResult.found && searchResult.user ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <IconUser size={20} className="text-purple-600" />
                        </div>
                        <div>
                          <Text variant="bodySm" fontWeight="medium">
                            {searchResult.user.firstName && searchResult.user.lastName
                              ? `${searchResult.user.firstName} ${searchResult.user.lastName}`
                              : searchResult.user.username !== searchResult.user.email
                                ? searchResult.user.username
                                : searchResult.user.email.split('@')[0]}
                          </Text>
                          <Text variant="bodySm" className="text-gray-600">
                            {searchResult.user.email}
                          </Text>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconUserCheck size={20} className="text-green-600" />
                        <Text variant="bodySm" className="text-green-700 font-medium">
                          Ready to assign
                        </Text>
                      </div>
                    </div>
                  ) : (
                    <Text variant="bodySm" className="text-red-700">
                      {searchResult.message || "User not found. They must have a CivicDataSpace account."}
                    </Text>
                  )}
                </div>
              )}

              <div className="pt-2 border-t">
                <Button
                  kind="tertiary"
                  onClick={() => {
                    setShowAddNew(false);
                    setEmailInput("");
                    setSearchResult(null);
                  }}
                >
                  Back to auditor list
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog.Content>
    </Dialog>
  );

  if (isControlled) {
    return (
      <>
        {inviteDialog}
        {toastNotification}
      </>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#C4B8F3] p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Text variant="headingMd" fontWeight="bold">
            Assigned Auditors
          </Text>
          <Text variant="bodySm" className="text-gray-600 mt-1">
            Invite auditors to evaluate this model version
          </Text>
        </div>
        <Button
          kind="primary"
          onClick={() => setIsModalOpen(true)}
          disabled={loading}
        >
          <IconPlus size={18} className="mr-1" /> Invite Auditor
        </Button>
      </div>

      {loading ? (
        <Text variant="bodySm" className="text-gray-500">
          Loading...
        </Text>
      ) : assignments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <IconUserCheck size={32} className="mx-auto text-gray-400" />
          <Text variant="bodySm" className="text-gray-500 mt-2">
            No auditors assigned yet
          </Text>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <IconUser size={16} className="text-purple-600" />
                </div>
                <div>
                  <Text variant="bodySm" fontWeight="medium">
                    {assignment.auditorUsername || assignment.auditorEmail}
                  </Text>
                  <Text variant="bodySm" className="text-gray-500">
                    {assignment.auditorEmail}
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    assignment.status === "ACCEPTED"
                      ? "bg-green-100 text-green-700"
                      : assignment.status === "DECLINED"
                      ? "bg-red-100 text-red-700"
                      : assignment.status === "COMPLETED"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {assignment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {inviteDialog}
      {toastNotification}
    </div>
  );
};

export default AuditorInvitation;
