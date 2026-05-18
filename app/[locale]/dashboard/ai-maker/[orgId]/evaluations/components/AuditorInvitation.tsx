"use client";

import { useGraphQL } from "@/lib/api";
import {
  IconPlus,
  IconSearch,
  IconUser,
  IconUserCheck,
} from "@tabler/icons-react";
import { Button, Dialog, Spinner, Tag, Text, TextField, toast } from "opub-ui";
import { useEffect, useState } from "react";

/** Profile image for search hit — same behavior as Add Evaluator on auditors page */
const SearchResultAvatar = ({
  src,
  alt,
  size = 16,
}: {
  src: string | null;
  alt: string;
  size?: number;
}) => {
  const [imageError, setImageError] = useState(false);
  const dataspaceUrl = process.env.NEXT_PUBLIC_DATASPACE_API_URL || "";
  const imageSrc = src ? `${dataspaceUrl}${src}` : "";

  if (!imageSrc || imageError) {
    return <IconUser size={size} className="text-purple-600" />;
  }

  const sizeClass = size === 20 ? "h-10 w-10" : "h-8 w-8";

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${sizeClass} rounded-full object-cover`}
      onError={() => setImageError(true)}
    />
  );
};

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
  auditorId: number;
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

const getUserDisplayName = (user: Auditor): string => {
  const firstName = user.firstName?.trim() || "";
  const lastName = user.lastName?.trim() || "";
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) return fullName;

  if (user.username && user.username !== user.email) {
    return user.username;
  }

  if (user.email) {
    return user.email.split("@")[0];
  }

  return "";
};

interface AuditorInvitationProps {
  organizationId: string;
  modelId: string;
  modelName: string;
  modelVersionId: number;
  onAssignmentCreated?: (assignment: AuditorAssignment) => void;
  onAssignmentResult?: (result: { type: "success" | "error"; message: string }) => void;
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
      auditorId
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
        auditorId
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
  modelName,
  modelVersionId,
  onAssignmentCreated,
  onAssignmentResult,
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
    ? (open: boolean) => {
        if (!open && externalOnClose) externalOnClose();
      }
    : setInternalIsOpen;
  const [selectedAuditorId, setSelectedAuditorId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [showAddNew, setShowAddNew] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [searchResult, setSearchResult] = useState<SearchUserResult | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const showResultToast = (type: "success" | "error", message: string) => {
    if (type === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
    if (onAssignmentResult) {
      onAssignmentResult({ type, message });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [auditorsResponse, assignmentsResponse] = await Promise.all([
          request(
            GET_ORGANIZATION_AUDITORS,
            { organizationId },
            { organization: organizationId },
          ),
          request(
            GET_AUDITOR_ASSIGNMENTS,
            { modelId, modelVersionId },
            { organization: organizationId },
          ),
        ]);

        if (auditorsResponse?.organizationAuditors) {
          setAuditors(auditorsResponse.organizationAuditors.auditors || []);
        }

        if (assignmentsResponse?.auditorAssignments) {
          setAssignments(assignmentsResponse.auditorAssignments || []);
        }
      } catch (err) {
        console.error("Error fetching evaluator data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (organizationId && modelId && modelVersionId && isModalOpen) {
      fetchData();
    }
  }, [organizationId, modelId, modelVersionId, request, isModalOpen]);

  const availableAuditors = auditors.filter(
    (auditor) => !assignments.some((a) => a.auditorEmail === auditor.email),
  );

  const handleSearchUser = async () => {
    if (!emailInput.trim()) return;

    try {
      setIsSearching(true);
      setSearchResult(null);

      const response = await request(
        SEARCH_USER_BY_EMAIL,
        { email: emailInput.trim() },
        { organization: organizationId },
      );

      if (response?.searchUserByEmail) {
        const hit = response.searchUserByEmail;
        setSearchResult(hit);
        if (hit.found && hit.user) {
          setEmailInput("");
        }
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

  const handleAssignAuditor = async (
    auditorId?: string,
    auditorEmail?: string,
    auditorUsername?: string,
    suppressSuccessToast: boolean = false
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
            modelName,
            modelVersionId,
            auditorEmail: email,
            notes,
          },
        },
        { organization: organizationId },
      );

      if (response?.assignAuditorToVersion?.success) {
        const newAssignment = response.assignAuditorToVersion.assignment;
        setAssignments((prev) => [...prev, newAssignment]);

        if (onAssignmentCreated) {
          onAssignmentCreated(newAssignment);
        }

        if (!suppressSuccessToast) {
          showResultToast("success", "Evaluator assigned successfully");
        }

        setIsModalOpen(false);
        setSelectedAuditorId("");
        setNotes("");
      } else {
        showResultToast(
          "error",
          response?.assignAuditorToVersion?.message ||
            "Failed to assign evaluator",
        );
      }
    } catch (err: any) {
      showResultToast("error", err?.message || "Error assigning evaluator");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAddNewAuditor = async () => {
    if (!searchResult?.user) return;

    try {
      setIsAddingNew(true);

      const existingAuditor = auditors.find(
        (a) => a.id === searchResult.user?.id || a.email === searchResult.user?.email
      );

      if (existingAuditor) {
        await handleAssignAuditor(
          existingAuditor.id,
          existingAuditor.email,
          existingAuditor.username
        );
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

        showResultToast(
          "success",
          addResponse.addAuditorToOrganization.message ||
            "Evaluator added successfully",
        );

        // Now assign the newly added auditor, but avoid double success toasts
        await handleAssignAuditor(
          searchResult.user.id,
          searchResult.user.email,
          searchResult.user.username,
          true
        );

        setShowAddNew(false);
        setEmailInput("");
        setSearchResult(null);
      } else {
        const errorMessage =
          addResponse?.addAuditorToOrganization?.message || "";

        showResultToast("error", errorMessage || "Failed to add evaluator");
      }
    } catch (err: any) {
      showResultToast("error", err?.message || "Error adding evaluator");
    } finally {
      setIsAddingNew(false);
    }
  };

  const auditorOptions = [
    { label: "Select an evaluator...", value: "" },
    ...availableAuditors.map((auditor) => {
      const displayName =
        auditor.firstName && auditor.lastName
          ? `${auditor.firstName} ${auditor.lastName}`
          : auditor.username !== auditor.email
            ? auditor.username
            : auditor.email.split("@")[0];
      return {
        label: `${displayName} (${auditor.email})`,
        value: auditor.id,
      };
    }),
  ];

  const inviteDialog = (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <Dialog.Content
        title={
          versionLabel
            ? `Invite Evaluator for Version ${versionLabel}`
            : "Invite Evaluator"
        }
        footer={<></>}
        primaryAction={{
          content: showAddNew
            ? isAddingNew
              ? "Adding..."
              : "Add & Assign Evaluator"
            : isAssigning
              ? "Assigning..."
              : "Assign Evaluator",
          onAction: showAddNew
            ? handleAddNewAuditor
            : () => handleAssignAuditor(),
          disabled: showAddNew
            ? !searchResult?.found || isAddingNew
            : !selectedAuditorId || isAssigning,
          ...(showAddNew
            ? {
                className:
                  "!rounded-[8px] !min-h-[46px] !px-6 !font-semibold !shadow-sm disabled:!cursor-not-allowed disabled:!bg-[#8c949d] disabled:!text-white disabled:!opacity-100 disabled:hover:!bg-[#8c949d]",
              }
            : {}),
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
                Select an evaluator from your organization to assign to this
                model version.
              </Text>

              {loading ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center gap-4">
                  <Spinner />
                  <Text variant="bodySm" className="text-gray-600">
                    Loading evaluators...
                  </Text>
                </div>
              ) : availableAuditors.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Evaluator
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
                    No available evaluators. All evaluators are already assigned
                    or you need to add new evaluators to your organization.
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
                <Button kind="tertiary" onClick={() => setShowAddNew(true)}>
                  Can&apos;t find the auditor? Add by email
                </Button>
              </div>
            </>
          ) : (
            <>
              <Text variant="bodySm" className="text-gray-600">
                Search for a user by email. If found, they will be added as an
                auditor to your organization and assigned to this model version.
              </Text>

              <div>
                <label
                  htmlFor="add-by-email-search"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="min-w-0 flex-1 [&_#add-by-email-search-tags]:box-border [&_#add-by-email-search-tags]:flex [&_#add-by-email-search-tags]:min-h-10 [&_#add-by-email-search-tags]:flex-row [&_#add-by-email-search-tags]:flex-nowrap [&_#add-by-email-search-tags]:items-center [&_#add-by-email-search-tags]:gap-1 [&_#add-by-email-search-tags_input]:min-h-0 [&_#add-by-email-search-tags_input]:min-w-0 [&_#add-by-email-search-tags_input]:flex-[1_1_auto] [&_#add-by-email-search-tags_input]:leading-2"
                  >
                    <TextField
                      key={
                        searchResult?.found && searchResult.user
                          ? `tag-${searchResult.user.id}`
                          : "email-entry"
                      }
                      id="add-by-email-search"
                      name="add-by-email-search"
                      label="Email Address"
                      labelHidden
                      type="email"
                      value={
                        searchResult?.found && searchResult.user
                          ? ""
                          : emailInput
                      }
                      onChange={(value) => setEmailInput(value)}
                      onEnter={() => {
                        if (emailInput.trim() && !isSearching) {
                          void handleSearchUser();
                        }
                      }}
                      placeholder={
                        searchResult?.found && searchResult.user
                          ? ""
                          : "evaluator@example.com"
                      }
                      readOnly={!!(searchResult?.found && searchResult.user)}
                      autoComplete="email"
                      tags={
                        searchResult?.found && searchResult.user ? (
                          <Tag
                            value={searchResult.user.id}
                            onRemove={() => {
                              setSearchResult(null);
                              setEmailInput("");
                            }}
                          >
                            {getUserDisplayName(searchResult.user)}
                          </Tag>
                        ) : undefined
                      }
                    />
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button
                      kind="secondary"
                      onClick={() => void handleSearchUser()}
                      disabled={!emailInput.trim() || isSearching}
                      className="rounded-[8px] border-none bg-primaryPurple2 px-8 py-3 text-base font-medium text-white hover:bg-[#6849EE] hover:text-white disabled:cursor-not-allowed disabled:bg-[#f2f2f2] disabled:text-[#8e8e8e] disabled:hover:bg-[#f2f2f2]"
                    >
                      <div className="flex h-full w-full items-center gap-2">
                        <IconSearch size={18} className="mr-1 shrink-0" />
                        <div>
                          {isSearching ? "Searching..." : "Search"}
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>

              {searchResult && (
                <div
                  className={`rounded-lg p-4 ${
                    searchResult.found
                      ? "border border-green-200 bg-green-50"
                      : "border border-red-200 bg-red-50"
                  }`}
                >
                  {searchResult.found && searchResult.user ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
                          <SearchResultAvatar
                            src={searchResult.user.profilePicture}
                            alt={searchResult.user.username}
                            size={20}
                          />
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <Text variant="bodySm" fontWeight="medium">
                            {getUserDisplayName(searchResult.user)}
                          </Text>
                          <Text variant="bodySm" className="text-gray-600">
                            {searchResult.user.email}
                          </Text>
                          {(searchResult.user.firstName ||
                            searchResult.user.lastName) &&
                            searchResult.user.username !==
                              searchResult.user.email && (
                              <Text variant="bodySm" className="text-gray-500">
                                @{searchResult.user.username}
                              </Text>
                            )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <IconUserCheck
                          size={20}
                          className="text-green-600"
                        />
                        <Text
                          variant="bodySm"
                          className="font-medium text-green-700"
                        >
                          Ready to assign
                        </Text>
                      </div>
                    </div>
                  ) : (
                    <Text variant="bodySm" className="text-red-700">
                      {searchResult.message ||
                        "User not found. They must have a CivicDataSpace account."}
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
      </>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#C4B8F3] p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Text variant="headingMd" fontWeight="bold">
            Assigned Evaluators
          </Text>
          <Text variant="bodySm" className="text-gray-600 mt-1">
            Invite evaluators to evaluate this model version
          </Text>
        </div>
        <Button
          kind="primary"
          onClick={() => setIsModalOpen(true)}
          disabled={loading}
        >
          <IconPlus size={18} className="mr-1" /> Invite Evaluator
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <Spinner />
          <Text variant="bodySm" className="text-gray-500">
            Loading...
          </Text>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <IconUserCheck size={32} className="mx-auto text-gray-400" />
          <Text variant="bodySm" className="text-gray-500 mt-2">
            No evaluators assigned yet
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
    </div>
  );
};

export default AuditorInvitation;
