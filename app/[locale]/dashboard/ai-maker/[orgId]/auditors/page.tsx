"use client";

import BreadCrumbs from "@/components/Breadcrumbs";
import { useGraphQL } from "@/lib/api";
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { Button, Dialog, Spinner, Tag, Text, Tooltip } from "opub-ui";
import { useEffect, useRef, useState } from "react";

// Custom Avatar component with error handling
const Avatar = ({
  src,
  alt,
  username,
  size = 16,
}: {
  src: string | null;
  alt: string;
  username: string;
  size?: number;
}) => {
  const [imageError, setImageError] = useState(false);
  const dataspaceUrl = process.env.NEXT_PUBLIC_DATASPACE_API_URL || "";
  let imageSrc = dataspaceUrl+src;

  if (!imageSrc || imageError) {
    return <IconUser size={size} className="text-purple-600" />;
  }

  const sizeClass = size === 20 ? "w-10 h-10" : "w-8 h-8";

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${sizeClass} rounded-full object-cover`}
      onError={() => setImageError(true)}
    />
  );
};

const TruncatedAuditorBio = ({ bio }: { bio?: string | null }) => {
  const text = bio?.trim() || "";
  const textRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      const element = textRef.current;
      if (!element || !text) {
        setIsTruncated(false);
        return;
      }
      setIsTruncated(
        element.scrollHeight > element.clientHeight ||
          element.scrollWidth > element.clientWidth
      );
    };

    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [text]);

  const bioNode = (
    <div
      ref={textRef}
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "-webkit-box",
        WebkitLineClamp: 1,
        WebkitBoxOrient: "vertical",
      }}
    >
      <Text variant="bodySm" className="text-gray-600 break-words">
        {text}
      </Text>
    </div>
  );

  if (!isTruncated || !text) {
    return bioNode;
  }

  return <Tooltip content={text}>{bioNode}</Tooltip>;
};

// Types
type Auditor = {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  bio?: string | null;
  profilePicture: string | null;
  joinedAt: string | null;
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



// GraphQL Queries
const GET_ORG_DETAILS = `
  query GetOrgDetails($orgId: ID!) {
    organization(id: $orgId) {
      id
      name
      logoUrl
      slug
    }
  }
`;

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
        bio
        profilePicture
        joinedAt
      }
      count
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

const REMOVE_AUDITOR_MUTATION = `
  mutation RemoveAuditorFromOrganization($organizationId: ID!, $userId: ID!) {
    removeAuditorFromOrganization(organizationId: $organizationId, userId: $userId) {
      success
      message
    }
  }
`;

const AuditorsPage = () => {
  const params = useParams();
  const locale = params?.locale || "en";
  const orgId = params?.orgId as string;

  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();

  // State
  const [organization, setOrganization] = useState<{
    name: string;
    logoUrl: string | null;
  } | null>(null);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [searchResult, setSearchResult] = useState<SearchUserResult | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [selectedAuditor, setSelectedAuditor] = useState<Auditor | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });

  useEffect(() => {
    if (!isAuthenticated || isSessionLoading || !orgId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [orgResponse, auditorsResponse] = await Promise.all([
          request(GET_ORG_DETAILS, { orgId }),
          request(
            GET_ORGANIZATION_AUDITORS,
            { organizationId: orgId },
            { organization: orgId }
          ),
        ]);

        if (orgResponse?.organization) {
          setOrganization({
            name: orgResponse.organization.name,
            logoUrl: orgResponse.organization.logoUrl,
          });
        }

        if (auditorsResponse?.organizationAuditors) {
          setAuditors(auditorsResponse.organizationAuditors.auditors || []);
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err?.message || "Failed to load evaluators");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isSessionLoading, orgId, request]);

  const handleSearchUser = async () => {
    if (!emailInput.trim()) return;

    try {
      setIsSearching(true);
      setSearchResult(null);
      setAddError(null);

      const response = await request(
        SEARCH_USER_BY_EMAIL,
        { email: emailInput.trim() },
        { organization: orgId }
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

  const handleAddAuditor = async () => {
    if (!searchResult?.user) return;

    try {
      setIsAdding(true);
      setAddError(null);

      const response = await request(
        ADD_AUDITOR_MUTATION,
        {
          organizationId: orgId,
          input: { userId: searchResult.user.id },
        },
        { organization: orgId }
      );

      if (response?.addAuditorToOrganization?.success) {
        // Refresh auditors list
        const auditorsResponse = await request(
          GET_ORGANIZATION_AUDITORS,
          { organizationId: orgId },
          { organization: orgId }
        );

        if (auditorsResponse?.organizationAuditors) {
          setAuditors(auditorsResponse.organizationAuditors.auditors || []);
        }

        // Close modal and reset
        setIsAddModalOpen(false);
        setEmailInput("");
        setSearchResult(null);
      } else {
        const errorMessage =
          response?.addAuditorToOrganization?.message ||
          "Failed to add auditor";

        setAddError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Error adding auditor";
      setAddError(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAuditor = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this evaluator?")) return;

    try {
      const response = await request(
        REMOVE_AUDITOR_MUTATION,
        { organizationId: orgId, userId },
        { organization: orgId }
      );

      if (response?.removeAuditorFromOrganization?.success) {
        setAuditors((prev) => prev.filter((a) => a.id !== userId));
        setToast({
          show: true,
          message: "Evaluator removed successfully",
          type: "success",
        });
      } else {
        setToast({
          show: true,
          message:
            response?.removeAuditorFromOrganization?.message ||
            "Failed to remove evaluator",
          type: "error",
        });
      }
    } catch (err: any) {
      setToast({
        show: true,
        message: err?.message || "Error removing evaluator",
        type: "error",
      });
    }
  };

  const getAuditorBio = (auditor: Auditor) => auditor.bio?.trim();

  return (
    <>
      <div className="flex items-center justify-between mb-8 mt-10">
        <div>
          <Text variant="headingLg" as="h1" fontWeight="bold">
            Evaluators
          </Text>
          <Text variant="bodySm" className="text-gray-600 mt-1">
            Manage evaluators who can evaluate your AI models
          </Text>
        </div>
        <button
          type="button"
          className="bg-primaryPurple2 hover:bg-[#6849EE] text-white hover:text-white  px-8 py-3 rounded-[8px] font-medium  text-base border-none"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Evaluator
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Spinner />
          <Text variant="bodySm" className="text-gray-600">
            Loading evaluators...
          </Text>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Text variant="bodyMd" className="text-red-600 mb-4">
            {error}
          </Text>
          <Button kind="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : auditors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
            <IconUser size={32} className="text-purple-600" />
          </div>
          <Text variant="bodyMd" className="text-gray-600 mb-2">
            No evaluators yet
          </Text>
          <Text
            variant="bodySm"
            className="text-gray-500 mb-4 text-center max-w-md"
          >
            Add evaluators to your organization so they can evaluate your AI
            models. Evaluators must have an account in CivicDataSpace.
          </Text>
          <Button
            kind="primary"
            className="bg-primaryPurple2 hover:bg-[#6849EE] text-white hover:text-white"
            onClick={() => setIsAddModalOpen(true)}
          >
            <IconPlus size={18} className="mr-1" /> Add Your First Auditor
          </Button>
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {auditors.map((auditor) => {
            const displayName = getUserDisplayName(auditor) || "-";

            return (
              <div
                key={auditor.id}
                className="flex flex-col gap-4 rounded-4 border-1 border-solid border-[#D5E1EA] bg-white p-6 shadow-card cursor-pointer"
                onClick={() => {
                  setSelectedAuditor(auditor);
                  setIsProfileModalOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedAuditor(auditor);
                    setIsProfileModalOpen(true);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-full border-1 border-solid border-[#D5E1EA] bg-purple-100 flex items-center justify-center overflow-hidden">
                    <Avatar
                      src={auditor.profilePicture}
                      alt={auditor.username}
                      username={auditor.username}
                      size={20}
                    />
                  </div>
                  <div className="flex flex-col gap-2 min-w-0">
                    <Text
                      variant="bodyMd"
                      fontWeight="semibold"
                      className="truncate text-primaryBlue"
                    >
                      {displayName}
                    </Text>
                    <TruncatedAuditorBio bio={getAuditorBio(auditor)} />
                  </div>
                </div>

                <div className="mt-auto pt-1">
                  <Button
                    kind="tertiary"
                    size="slim"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAuditor(auditor.id);
                    }}
                  >
                    <span className="ml-1 inline-flex items-center gap-2">
                      <IconTrash size={16} />
                      <span className="relative top-[1px]">Remove</span>
                    </span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) {
            // Reset form and error state whenever the modal is closed
            setEmailInput("");
            setSearchResult(null);
            setAddError(null);
          }
        }}
      >
        <Dialog.Content
          title="Add Evaluator"
          footer={<></>}
          primaryAction={{
            content: isAdding ? "Adding..." : "Add Evaluator",
            onAction: handleAddAuditor,
            disabled: !searchResult?.found || isAdding,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => {
                setIsAddModalOpen(false);
                setEmailInput("");
                setSearchResult(null);
                setAddError(null);
              },
            },
          ]}
        >
          <div className="space-y-4">
            <Text variant="bodySm" className="text-gray-600">
              Search for a user by their email address. The user must have an
              account in CivicDataSpace to be added as an evaluator.
            </Text>

            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative min-w-0">
                  <input
                    type="email"
                    value={
                      searchResult?.found && searchResult.user
                        ? ""
                        : emailInput
                    }
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={
                      searchResult?.found && searchResult.user
                        ? ""
                        : "evaluator@example.com"
                    }
                    readOnly={!!(searchResult?.found && searchResult.user)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {searchResult?.found && searchResult.user && (
                    <div className="absolute inset-y-0 left-px flex items-center pl-3 pr-2 gap-2">
                      <Tag
                        value={searchResult.user.id}
                        onRemove={() => {
                          setSearchResult(null);
                          setEmailInput("");
                          setAddError(null);
                        }}
                      >
                        {getUserDisplayName(searchResult.user)}
                      </Tag>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  kind="secondary"
                  onClick={handleSearchUser}
                  disabled={!emailInput.trim() || isSearching}
                  className="bg-primaryPurple2 hover:bg-[#6849EE] text-white hover:text-white  px-8 py-3 rounded-[8px] font-medium text-base border-none"
                >
                  <div className="flex items-end gap-2 h-full w-full">
                    <IconSearch size={18} className="mr-1" />
                    <div>{isSearching ? "Searching..." : "Search"}</div>
                  </div>
                </Button>
              </div>
            </div>

            {searchResult && (
              <div
                className={`p-4 rounded-lg ${
                  searchResult.found
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {searchResult.found && searchResult.user ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Avatar
                        src={searchResult.user.profilePicture}
                        alt={searchResult.user.username}
                        username={searchResult.user.username}
                        size={20}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
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
                ) : (
                  <Text variant="bodySm" className="text-red-700">
                    {searchResult.message || "User not found"}
                  </Text>
                )}
              </div>
            )}

            {addError && (
              <Text
                variant="bodySm"
                color="critical"
                className="mt-2"
              >
                {addError}
              </Text>
            )}
          </div>
        </Dialog.Content>
      </Dialog>

      <Dialog
        open={isProfileModalOpen}
        onOpenChange={(open) => {
          setIsProfileModalOpen(open);
          if (!open) {
            setSelectedAuditor(null);
          }
        }}
      >
        <Dialog.Content
          title="Evaluator Profile"
          footer={<></>}
          secondaryActions={[
            {
              content: "Close",
              onAction: () => {
                setIsProfileModalOpen(false);
                setSelectedAuditor(null);
              },
            },
          ]}
        >
          {selectedAuditor && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full border-1 border-solid border-[#D5E1EA] bg-purple-100 flex items-center justify-center overflow-hidden">
                  <Avatar
                    src={selectedAuditor.profilePicture}
                    alt={selectedAuditor.username}
                    username={selectedAuditor.username}
                    size={20}
                  />
                </div>
                <div className="min-w-0">
                  <Text variant="headingSm" fontWeight="semibold" className="text-primaryBlue">
                    {getUserDisplayName(selectedAuditor) || "-"}
                  </Text>
                </div>
              </div>
              <div className="ml-2">
                <Text variant="bodySm" className="text-gray-700 whitespace-pre-wrap break-words">
                  {getAuditorBio(selectedAuditor)}
                </Text>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog>

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

export default AuditorsPage;
