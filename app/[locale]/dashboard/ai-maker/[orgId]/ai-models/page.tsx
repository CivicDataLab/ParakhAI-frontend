"use client";

import BreadCrumbs from "@/components/Breadcrumbs";
import { Icons } from "@/components/icons";
import { Pagination } from "@/components/Pagination/Pagination";
import { useGraphQL } from "@/lib/api";
import { IconChevronDown, IconMinus, IconX } from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, DataTable, Dialog, Popover, Tag, Text } from "opub-ui";
import React from "react";
import WelcomeSection from "../../../components/WelcomeSection";

const GET_ORG_DETAILS = `
  query GetOrgDetails($orgId: ID!) {
    organization(id: $orgId) {
      id
      name
      logoUrl
    }
  }
`;

type AIModel = {
  id: string;
  name: string;
  displayName: string;
  version: string;
  modelType: string;
  isPublic: boolean;
  organization?: string;
  updatedAt?: string;
  testCasesCount?: number;
  auditsCount?: number;
  tags?: string[];
  owner?: string;
};

const AI_MODELS_QUERY = `
  query GetAIModels(
    $status: String
    $modelType: String
    $provider: String
    $isPublic: Boolean
    $limit: Int
    $offset: Int
  ) {
    aiModels(
      status: $status
      modelType: $modelType
      provider: $provider
      isPublic: $isPublic
      limit: $limit
      offset: $offset
    ) {
      id
      name
      displayName
      version
      modelType
      isPublic
      organization
    }
  }
`;

const sectorOptions = [
  "Healthcare",
  "Technology",
  "Finance",
  "Law & Justice",
  "General Translation",
];
const tagOptions = [
  "English",
  "Clinical",
  "Justice",
  "Mizo",
  "Odiya",
  "Translation",
  "Finance",
  "Education",
  "Healthcare",
  "Technology",
  "Agriculture",
  "Manufacturing",
  "Retail",
  "Tourism",
  "Transport",
  "Energy",
  "Environment",
  "Public Policy",
  "Data Science",
  "Cybersecurity",
  "Analytics",
  "Compliance",
  "Marketing",
  "Legal",
  "Research",
  "Operations",
  "Human Resources",
  "Logistics",
  "Content",
  "Localization",
  "Quality Assurance",
  "Testing",
  "Sales",
  "Strategy",
  "Innovation",
  "Engineering",
  "Automation",
  "Simulation",
  "Predictive Modeling",
  "Benchmarking",
  "Risk Assessment",
  "Auditing",
  "Accessibility",
  "Performance",
  "Ethics",
  "Diversity",
  "Inclusion",
  "Governance",
  "Regulation",
  "Open Data",
  "Knowledge Base",
  "Documentation",
  "Citizen Services",
  "Smart Cities",
  "Climate",
  "Finance Analytics",
  "Behavioral Insights",
  "Scenario Planning",
  "Rapid Prototyping",
  "Localization QA",
];

const AIModelsPage = () => {
  const SearchIcon = Icons.search;
  const ClearIcon = Icons.cross;
  const { request, isAuthenticated } = useGraphQL();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";

  const [searchValue, setSearchValue] = React.useState("");
  const [selectedSectors, setSelectedSectors] = React.useState<string[]>([]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [resultsPerPage, setResultsPerPage] = React.useState("9");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sectorsExpanded, setSectorsExpanded] = React.useState(true);
  const [tagsExpanded, setTagsExpanded] = React.useState(true);
  const [selectedModel, setSelectedModel] = React.useState<AIModel | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [showNotice, setShowNotice] = React.useState(true);
  const [aiModels, setAiModels] = React.useState<AIModel[]>([]);
  const [organization, setOrganization] = React.useState<{
    name: string;
    logoUrl: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleToggleSelection = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  // Fetch AI models from DataSpace
  React.useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAIModels = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [modelsResponse, orgResponse] = await Promise.all([
          request<{
            aiModels: Array<{
              id: string;
              name: string;
              displayName: string;
              version: string;
              modelType: string;
              isPublic: boolean;
              organization?: string;
            }>;
          }>(
            AI_MODELS_QUERY,
            {
              status: "ACTIVE",
              modelType: null,
              provider: null,
              isPublic: true,
              limit: 50,
              offset: 0,
            },
            { organization: params.orgId as string }
          ),
          request(GET_ORG_DETAILS, { orgId: params.orgId }),
        ]);

        const models = modelsResponse?.aiModels || [];
        if (orgResponse?.organization) {
          setOrganization(orgResponse.organization);
        }
        const formatted: AIModel[] = models.map((model) => ({
          id: model.id,
          name: model.name,
          displayName: model.displayName,
          version: model.version,
          modelType: model.modelType,
          isPublic: model.isPublic,
          organization: model.organization,
          testCasesCount: Math.floor(Math.random() * 2000) + 100, // Placeholder
          auditsCount: Math.floor(Math.random() * 50) + 1, // Placeholder
          tags: [model.modelType, model.organization || "General"],
          owner: model.organization || "ParakhAI",
          updatedAt: "19 July 2024", // Placeholder
        }));

        setAiModels(formatted);
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to load AI models";
        setError(errorMessage);
        console.error("Error fetching AI models:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAIModels();
  }, [isAuthenticated, request]);

  const filteredModels = aiModels.filter((model) => {
    const matchesSearch =
      model.displayName.toLowerCase().includes(searchValue.toLowerCase()) ||
      model.name.toLowerCase().includes(searchValue.toLowerCase());
    const matchesSector =
      selectedSectors.length === 0 ||
      (model.tags && model.tags.some((tag) => selectedSectors.includes(tag)));
    const matchesTags =
      selectedTags.length === 0 ||
      (model.tags && model.tags.some((tag) => selectedTags.includes(tag)));
    return matchesSearch && matchesSector && matchesTags;
  });

  const formatNumber = React.useCallback(
    (value: number) => value.toLocaleString(),
    []
  );

  // Pagination logic
  const itemsPerPage = parseInt(resultsPerPage, 10);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredModels.length / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedModels = filteredModels.slice(startIndex, endIndex);

  // Reset to page 1 when filters or results per page change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, selectedSectors, selectedTags, resultsPerPage]);

  // Ensure current page is valid when filtered results change
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Handle card click to open dialog
  const handleCardClick = (model: AIModel) => {
    setSelectedModel(model);
    setDialogOpen(true);
  };

  // Handle New Evaluation button click
  const handleNewEvaluation = (model: AIModel) => {
    // Navigate to new evaluation page with model pre-selected
    router.push(
      `/${locale}/dashboard/ai-maker/${params.orgId}/evaluations/new?modelId=${model.id}`
    );
  };

  // Sample table data - replace with actual API call based on selectedModel
  const tableData = React.useMemo(() => {
    if (!selectedModel) return [];

    // Generate sample data based on selected model
    return Array.from({ length: 13 }, (_, index) => ({
      input: "Content",
      idealOutput: "Content",
      columnName1: "Content",
      columnName2: "Content",
    }));
  }, [selectedModel]);

  // Define table columns
  const columns = React.useMemo(
    () => [
      {
        accessorKey: "input",
        header: (
          <span className="dt-header-with-icon">
            <img
              src="/images/icons/arrows-sort.png"
              alt=""
              width={12}
              height={12}
            />
            <span>Input</span>
          </span>
        ),
      },
      {
        accessorKey: "idealOutput",
        header: "Ideal Output",
      },
      {
        accessorKey: "columnName1",
        header: "Column name",
      },
      {
        accessorKey: "columnName2",
        header: "Column name",
      },
    ],
    []
  );

  return (
    <div className="flex flex-col min-h-screen bg-white ai-models-page">
      <BreadCrumbs
        data={[
          { href: "/", label: "Home" },
          { href: "/dashboard", label: "User Dashboard" },
          { href: `/${locale}/dashboard/ai-maker`, label: "AI Maker" },
          {
            href: `/${locale}/dashboard/ai-maker/${params.orgId}`,
            label: organization?.name || "Dashboard",
          },
          { href: "#", label: "AI Models" },
        ]}
      />

      <div className="flex flex-1 gap-8 px-8 main-content-wrapper">
        <WelcomeSection
          orgName={organization?.name}
          orgLogo={organization?.logoUrl}
        />

        <div className="flex-1 ai-models-content p-10">
          <div className="ai-models-page-header">
            <Text as="h1" className="ai-models-page-title" fontWeight="bold">
              AI Models
            </Text>
          </div>

          <div className="ai-models-search-row">
            <div className="ai-models-search-input">
              <label htmlFor="aiModelsSearch" className="sr-only">
                Search AI models
              </label>
              <div className="ai-models-search-box">
                <SearchIcon
                  size={18}
                  className="ai-models-search-icon"
                  aria-hidden
                />
                <input
                  id="aiModelsSearch"
                  type="text"
                  value={searchValue}
                  placeholder="Search by name"
                  onChange={(event) => setSearchValue(event.target.value)}
                  className="ai-models-search-field"
                />
                {searchValue && (
                  <button
                    type="button"
                    className="ai-models-search-clear"
                    onClick={() => setSearchValue("")}
                    aria-label="Clear search"
                  >
                    <ClearIcon size={16} aria-hidden />
                  </button>
                )}
              </div>
            </div>
            <div className="ai-models-search-actions">
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <Popover.Trigger asChild>
                  <button type="button" className="ai-models-add-filters-link">
                    Add Filters
                  </button>
                </Popover.Trigger>
                <Popover.Content
                  side="bottom"
                  align="end"
                  alignOffset={10}
                  className="ai-models-filter-popover"
                >
                  <div className="ai-models-filter-popover-header">
                    <Text as="span" className="ai-models-filter-popover-title">
                      FILTERS
                    </Text>
                    <Button
                      kind="tertiary"
                      size="slim"
                      onClick={() => {
                        setSelectedSectors([]);
                        setSelectedTags([]);
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                  <div className="ai-models-filter-popover-scroll">
                    <div className="ai-models-filter-section">
                      <button
                        type="button"
                        className="ai-models-filter-section-header"
                        onClick={() => setSectorsExpanded((prev) => !prev)}
                        aria-expanded={sectorsExpanded}
                      >
                        <span className="ai-models-filter-section-title">
                          Sectors ({sectorOptions.length})
                        </span>
                        {sectorsExpanded ? (
                          <IconMinus size={16} />
                        ) : (
                          <IconChevronDown size={16} />
                        )}
                      </button>
                      {sectorsExpanded && (
                        <div className="ai-models-filter-section-options ai-models-filter-section-options--scrollable">
                          {sectorOptions.map((sector) => (
                            <label
                              key={sector}
                              className="ai-models-filter-checkbox"
                            >
                              <input
                                type="checkbox"
                                checked={selectedSectors.includes(sector)}
                                onChange={() =>
                                  handleToggleSelection(
                                    sector,
                                    setSelectedSectors
                                  )
                                }
                              />
                              <span>{sector}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="ai-models-filter-section">
                      <button
                        type="button"
                        className="ai-models-filter-section-header"
                        onClick={() => setTagsExpanded((prev) => !prev)}
                        aria-expanded={tagsExpanded}
                      >
                        <span className="ai-models-filter-section-title">
                          Tags ({tagOptions.length})
                        </span>
                        {tagsExpanded ? (
                          <IconMinus size={16} />
                        ) : (
                          <IconChevronDown size={16} />
                        )}
                      </button>
                      {tagsExpanded && (
                        <div className="ai-models-filter-section-options ai-models-filter-section-options--scrollable">
                          {tagOptions.map((tag) => (
                            <label
                              key={tag}
                              className="ai-models-filter-checkbox"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTags.includes(tag)}
                                onChange={() =>
                                  handleToggleSelection(tag, setSelectedTags)
                                }
                              />
                              <span>{tag}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Popover.Content>
              </Popover>
            </div>
          </div>
          <div className="ai-models-active-filters">
            {selectedSectors.concat(selectedTags).map((filter) => (
              <div key={filter} className="ai-models-filter-tag">
                <Tag
                  value={filter}
                  variation="filled"
                  fillColor="#E2F5C4"
                  textColor="#0A0704"
                  onRemove={() => {
                    if (selectedSectors.includes(filter)) {
                      setSelectedSectors((prev) =>
                        prev.filter((sector) => sector !== filter)
                      );
                    } else {
                      setSelectedTags((prev) =>
                        prev.filter((tag) => tag !== filter)
                      );
                    }
                  }}
                >
                  {filter}
                </Tag>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="py-8 text-center col-span-full">
                <Text variant="bodySm" className="text-gray-600">
                  Loading AI models...
                </Text>
              </div>
            ) : error ? (
              <div className="py-8 text-center col-span-full">
                <Text variant="bodySm" className="text-red-600">
                  {error}
                </Text>
              </div>
            ) : paginatedModels.length === 0 ? (
              <div className="py-8 text-center col-span-full">
                <Text variant="bodySm" className="text-gray-600">
                  No AI models found.
                </Text>
              </div>
            ) : (
              paginatedModels.map((model, index) => {
                const updatedValue = model.updatedAt || "Unknown";
                const testCasesValue = `${formatNumber(model.testCasesCount || 0)} test cases`;
                const auditsValue = `${formatNumber(model.auditsCount || 0)} audits`;

                const metadataContent = [
                  {
                    icon: Icons.calendar,
                    label: "Updated",
                    value: updatedValue,
                  },
                  {
                    icon: Icons.testPipe,
                    label: "Test cases",
                    value: testCasesValue,
                  },
                  {
                    icon: Icons.discountCheck,
                    label: "Audits",
                    value: auditsValue,
                  },
                ] as any;

                // Alternate between Parakh and CDL for different cards
                const rightIcon =
                  index % 2 === 0
                    ? "/images/icons/Parakh.png"
                    : "/images/icons/CDL.png";
                const rightLabel = index % 2 === 0 ? "Parakh" : "CDL";

                const footerContent = [
                  {
                    icon: "/images/icons/Disaster.png",
                    label: "Disaster",
                  },
                  {
                    icon: rightIcon,
                    label: rightLabel,
                  },
                ];

                const type = (model.tags || []).map((tag) => ({
                  label: tag,
                  fillColor: "#D7CFF9",
                  borderColor: "#D7CFF9",
                }));

                return (
                  <div key={model.id} className="ai-models-card-wrapper">
                    <div
                      onClick={() => handleNewEvaluation(model)}
                      style={{ cursor: "pointer" }}
                      className="h-full"
                    >
                      <Card
                        title={model.displayName}
                        description={`${model.modelType} - Version ${model.version}`}
                        variation="collapsed"
                        iconColor="highlight"
                        metadataContent={metadataContent}
                        footerContent={footerContent}
                        type={type}
                        tag={model.tags || []}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={itemsPerPage}
            pageSizeOptions={[9, 18, 27]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newPageSize) => {
              setResultsPerPage(String(newPageSize));
              setCurrentPage(1);
            }}
            label="Results per page"
          />
        </div>
      </div>

      {/* Dialog for showing model details */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content
          title=""
          headerHidden
          large
          className="AIModelDlg"
          style={{ maxHeight: "85vh" }}
          primaryAction={{
            content: "",
            onAction: () => {},
          }}
          secondaryActions={[
            {
              content: "",
              onAction: () => setDialogOpen(false),
            },
          ]}
        >
          <div className="AIModelDlg__hdr">
            <div className="AIModelDlg__actions">
              <button
                className="AIModelDlg__flag"
                aria-label="Flag this model"
                onClick={() => {}}
              >
                <img
                  src="/images/icons/flag-2-filled.png"
                  alt="Flag"
                  width={18}
                  height={18}
                />
              </button>

              <button
                className="AIModelDlg__close"
                aria-label="Close"
                onClick={() => setDialogOpen(false)}
              >
                <IconX size={18} />
              </button>
            </div>
          </div>

          {selectedModel && (
            <Text as="h2" className="ai-models-dialog-title" fontWeight="bold">
              {selectedModel.displayName}
            </Text>
          )}

          {showNotice && (
            <div className="AIModelDlg__note">
              <span>
                Notice something wrong with this AI model? Flag the issue by
                clicking the red flag above.
              </span>
              <button
                type="button"
                className="AIModelDlg__noteClose"
                aria-label="Dismiss notice"
                onClick={() => setShowNotice(false)}
              >
                <IconX size={12} stroke={2} color="#000000" />
              </button>
            </div>
          )}

          <div className="AIModelDlg__body">
            {selectedModel && (
              <DataTable
                rows={tableData}
                columns={columns}
                hideSelection={true}
                hideFooter={true}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog>
    </div>
  );
};

export default AIModelsPage;
