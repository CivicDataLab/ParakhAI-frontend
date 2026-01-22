"use client";

import BreadCrumbs from "@/components/Breadcrumbs";
import { useGraphQL } from "@/lib/api";
import { IconPlus, IconSearch, IconTrash, IconUser, IconX } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { Button, DataTable, Dialog, Text } from "opub-ui";
import { useEffect, useState } from "react";
import WelcomeSection from "../../../components/WelcomeSection";

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

type SearchUserResult = {
  found: boolean;
  message?: string;
  user?: Auditor;
};

// GraphQL Queries
const GET_ORG_DETAILS = `
  query GetOrgDetails($orgId: ID!) {
    organization(id: $orgId) {
      id
      name
      logoUrl
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

  const { request, isAuthenticated, isLoading: isSessionLoading } = useGraphQL();

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
  const [searchResult, setSearchResult] = useState<SearchUserResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

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
          request(GET_ORGANIZATION_AUDITORS, { organizationId: orgId }, { organization: orgId }),
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
        setError(err?.message || "Failed to load auditors");
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

        setToast({
          show: true,
          message: response.addAuditorToOrganization.message || "Auditor added successfully",
          type: "success",
        });

        // Close modal and reset
        setIsAddModalOpen(false);
        setEmailInput("");
        setSearchResult(null);
      } else {
        setToast({
          show: true,
          message: response?.addAuditorToOrganization?.message || "Failed to add auditor",
          type: "error",
        });
      }
    } catch (err: any) {
      setToast({
        show: true,
        message: err?.message || "Error adding auditor",
        type: "error",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAuditor = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this auditor?")) return;

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
          message: "Auditor removed successfully",
          type: "success",
        });
      } else {
        setToast({
          show: true,
          message: response?.removeAuditorFromOrganization?.message || "Failed to remove auditor",
          type: "error",
        });
      }
    } catch (err: any) {
      setToast({
        show: true,
        message: err?.message || "Error removing auditor",
        type: "error",
      });
    }
  };

  const columns = [
    {
      accessorKey: "username",
      header: "Username",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            {row.original.profilePicture ? (
              <img
                src={row.original.profilePicture}
                alt={row.original.username}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <IconUser size={16} className="text-purple-600" />
            )}
          </div>
          <Text variant="bodySm" fontWeight="medium">
            {row.original.username}
          </Text>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }: any) => (
        <Text variant="bodySm">{getValue()}</Text>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }: any) => {
        const firstName = row.original.firstName || "";
        const lastName = row.original.lastName || "";
        const fullName = `${firstName} ${lastName}`.trim();
        return (
          <Text variant="bodySm">{fullName || "-"}</Text>
        );
      },
    },
    {
      accessorKey: "joinedAt",
      header: "Joined",
      cell: ({ getValue }: any) => {
        const date = getValue();
        if (!date) return <Text variant="bodySm">-</Text>;
        return (
          <Text variant="bodySm">
            {new Date(date).toLocaleDateString()}
          </Text>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <Button
          kind="tertiary"
          size="slim"
          onClick={() => handleRemoveAuditor(row.original.id)}
        >
          <IconTrash size={16} className="mr-1" /> Remove
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-visible">
      <BreadCrumbs
        data={[
          { href: "/", label: "Home" },
          { href: "/dashboard", label: "User Dashboard" },
          { href: `/${locale}/dashboard/ai-maker`, label: "AI Maker" },
          {
            href: `/${locale}/dashboard/ai-maker/${orgId}`,
            label: organization?.name || "Dashboard",
          },
          { href: "#", label: "Auditors" },
        ]}
      />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 overflow-x-visible">
        <div className="flex flex-1 flex-col lg:flex-row gap-6 md:gap-8 lg:-ml-[120px] xl:-ml-[130px]">
          <WelcomeSection
            orgName={organization?.name}
            orgLogo={organization?.logoUrl}
          />

          <div className="flex-1 bg-gray-50 p-4 sm:p-6 lg:p-10 mt-6 lg:mt-0">
            <div className="flex items-center justify-between mb-8">
              <div>
                <Text variant="headingLg" as="h1" fontWeight="bold">
                  Auditors
                </Text>
                <Text variant="bodySm" className="text-gray-600 mt-1">
                  Manage auditors who can evaluate your AI models
                </Text>
              </div>
              <Button
                kind="primary"
                onClick={() => setIsAddModalOpen(true)}
              >
                <IconPlus size={18} className="mr-1" /> Add Auditor
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Text variant="bodySm" className="text-gray-600">
                  Loading auditors...
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
                  No auditors yet
                </Text>
                <Text variant="bodySm" className="text-gray-500 mb-4 text-center max-w-md">
                  Add auditors to your organization so they can evaluate your AI models.
                  Auditors must have an account in CivicDataSpace.
                </Text>
                <Button
                  kind="primary"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <IconPlus size={18} className="mr-1" /> Add Your First Auditor
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <DataTable
                  rows={auditors}
                  columns={columns}
                  hoverable={true}
                  hideSelection={true}
                  hideFooter={auditors.length <= 10}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <Dialog.Content
          title="Add Auditor"
          footer={<></>}
          primaryAction={{
            content: isAdding ? "Adding..." : "Add Auditor",
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
              },
            },
          ]}
        >
          <div className="space-y-4">
            <Text variant="bodySm" className="text-gray-600">
              Search for a user by their email address. The user must have an account
              in CivicDataSpace to be added as an auditor.
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
                      {searchResult.user.profilePicture ? (
                        <img
                          src={searchResult.user.profilePicture}
                          alt={searchResult.user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <IconUser size={20} className="text-purple-600" />
                      )}
                    </div>
                    <div>
                      <Text variant="bodySm" fontWeight="medium">
                        {searchResult.user.username}
                      </Text>
                      <Text variant="bodySm" className="text-gray-600">
                        {searchResult.user.email}
                      </Text>
                      {(searchResult.user.firstName || searchResult.user.lastName) && (
                        <Text variant="bodySm" className="text-gray-500">
                          {`${searchResult.user.firstName || ""} ${searchResult.user.lastName || ""}`.trim()}
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
          </div>
        </Dialog.Content>
      </Dialog>

      {toast.show && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
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
      )}
    </div>
  );
};

export default AuditorsPage;
