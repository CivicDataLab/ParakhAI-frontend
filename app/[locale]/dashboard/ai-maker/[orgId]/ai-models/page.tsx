"use client";

import { Icons } from "@/components/icons";
import { Pagination } from "@/components/Pagination/Pagination";
import { useGraphQL } from "@/lib/api";
import { IconChevronDown, IconMinus, IconX } from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  DataTable,
  Dialog,
  Popover,
  Spinner,
  Tag,
  Text,
} from "opub-ui";
import React from "react";
import { useOrganization } from "../OrganizationContext";

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
    $limit: Int
    $offset: Int
  ) {
    aiModels(
      status: $status
      modelType: $modelType
      provider: $provider
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
      updatedAt
      testCasesCount
      auditsCount
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
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const modelTypeLabels: Record<string, string> = {
    TRANSLATION: "Translation",
    TEXT_GENERATION: "Text Generation",
    SUMMARIZATION: "Summarisation",
    QUESTION_ANSWERING: "Question Answering",
    SENTIMENT_ANALYSIS: "Sentiment Analysis",
    TEXT_CLASSIFICATION: "Text Classification",
    NAMED_ENTITY_RECOGNITION: "Named Entity Recognition",
    TEXT_TO_SPEECH: "Text to Speech",
    SPEECH_TO_TEXT: "Speech to Text",
    OTHER: "Other",
  };

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

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "--";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "--";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Fetch AI models from DataSpace
  React.useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAIModels = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const modelsResponse = await request<{
          aiModels: Array<{
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
          }>;
        }>(
          AI_MODELS_QUERY,
          {
            status: "ACTIVE",
            modelType: null,
            provider: null,
            limit: 50,
            offset: 0,
          },
          { organization: params.orgId as string }
        );

        const models = modelsResponse?.aiModels || [];
        const formatted: AIModel[] = models.map((model) => ({
          id: model.id,
          name: model.name,
          displayName: model.displayName,
          version: model.version,
          modelType: model.modelType,
          isPublic: model.isPublic,
          organization: model.organization,
          testCasesCount: model.testCasesCount, // Placeholder
          auditsCount: model.auditsCount, // Placeholder
          tags: [modelTypeLabels[model.modelType] || model.modelType],
          owner: model.organization || "ParakhAI",
          updatedAt: model.updatedAt, // Placeholder
        }));
        // const formatted: AIModel[] = await Promise.all(
        //   models.map(async (model) => {
        //     const { testCasesCount, auditsCount } =
        //       await fetchAuditStats(model.id);

        //     return {
        //       id: model.id,
        //       name: model.name,
        //       displayName: model.displayName,
        //       version: model.version,
        //       modelType: model.modelType,
        //       isPublic: model.isPublic,
        //       organization: model.organization,
        //       testCasesCount: testCasesCount || 0,          // ✅ real data
        //       auditsCount: auditsCount || 0,             // ✅ real data
        //       tags: [modelTypeLabels[model.modelType] || model.modelType],
        //       owner: model.organization || "ParakhAI",
        //       updatedAt: model.updatedAt,
        //     };
        //   })
        // );

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
  }, [isAuthenticated, request, params.orgId]);

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

  // Handle card click to navigate to detail page
  const handleCardClick = (model: AIModel) => {
    router.push(
      `/${locale}/dashboard/ai-maker/${params.orgId}/ai-models/${model.id}`
    );
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
    <>
      <div className="ai-models-content">
        <div className="prompt-page-header mt-10 text-left">
          <Text
            as="h1"
            className="prompt-page-title text-left"
            fontWeight="bold"
          >
            AI Models
          </Text>
        </div>

        <div className="prompt-search-row mb-8">
          <div className="prompt-search-input">
            <label htmlFor="aiModelsSearch" className="sr-only">
              Search AI models
            </label>
            <div className="prompt-search-box">
              <SearchIcon
                size={18}
                className="prompt-search-icon"
                aria-hidden
              />
              <input
                id="aiModelsSearch"
                type="text"
                value={searchValue}
                placeholder="Search by name"
                onChange={(event) => setSearchValue(event.target.value)}
                className="prompt-search-field"
              />
              {searchValue && (
                <button
                  type="button"
                  className="prompt-search-clear"
                  onClick={() => setSearchValue("")}
                  aria-label="Clear search"
                >
                  <ClearIcon size={16} aria-hidden />
                </button>
              )}
            </div>
          </div>
          <div className="prompt-search-actions">
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <Popover.Trigger asChild>
                <button type="button" className="prompt-add-filters-link">
                  Add Filters
                </button>
              </Popover.Trigger>
              <Popover.Content
                side="bottom"
                align="end"
                alignOffset={10}
                className="prompt-filter-popover"
              >
                <div className="prompt-filter-popover-header">
                  <Text as="span" className="prompt-filter-popover-title">
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
                <div className="prompt-filter-popover-scroll">
                  <div className="prompt-filter-section">
                    <button
                      type="button"
                      className="prompt-filter-section-header"
                      onClick={() => setSectorsExpanded((prev) => !prev)}
                      aria-expanded={sectorsExpanded}
                    >
                      <span className="prompt-filter-section-title">
                        Sectors ({sectorOptions.length})
                      </span>
                      {sectorsExpanded ? (
                        <IconMinus size={16} />
                      ) : (
                        <IconChevronDown size={16} />
                      )}
                    </button>
                    {sectorsExpanded && (
                      <div className="prompt-filter-section-options prompt-filter-section-options--scrollable">
                        {sectorOptions.map((sector) => (
                          <label
                            key={sector}
                            className="prompt-filter-checkbox"
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

                  <div className="prompt-filter-section">
                    <button
                      type="button"
                      className="prompt-filter-section-header"
                      onClick={() => setTagsExpanded((prev) => !prev)}
                      aria-expanded={tagsExpanded}
                    >
                      <span className="prompt-filter-section-title">
                        Tags ({tagOptions.length})
                      </span>
                      {tagsExpanded ? (
                        <IconMinus size={16} />
                      ) : (
                        <IconChevronDown size={16} />
                      )}
                    </button>
                    {tagsExpanded && (
                      <div className="prompt-filter-section-options prompt-filter-section-options--scrollable">
                        {tagOptions.map((tag) => (
                          <label key={tag} className="prompt-filter-checkbox">
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
        <div className="prompt-active-filters mb-8">
          {selectedSectors.concat(selectedTags).map((filter) => (
            <div key={filter} className="prompt-filter-tag">
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
            <div className="flex flex-col items-center justify-center gap-4 py-8 col-span-full">
              <Spinner />
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
              const updatedValue = formatDate(model.updatedAt) || "Unknown";
              const testCasesValue = `${formatNumber(model.testCasesCount || 0)} test cases`;
              const auditsValue = `${formatNumber(model.auditsCount || 0)} evaluations`;

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
                  label: "Evaluations",
                  value: auditsValue,
                },
              ] as any;

              // Alternate between Parakh and CDL for different cards
              const rightIcon =
                index % 2 === 0
                  ? "/images/icons/Parakh.png"
                  : "/images/icons/CDL.png";
              const rightLabel = index % 2 === 0 ? "Parakh" : "CDL";

              // const footerContent = [
              //   // {
              //   //   icon: "/images/icons/Disaster.png",
              //   //   label: "Disaster",
              //   // },
              //   {
              //     icon: rightIcon,
              //     label: rightLabel,
              //   },
              // ];

              const type = (model.tags || []).map((tag) => ({
                label: tag,
                fillColor: "#E2F5C4",
                borderColor: "#E2F5C4",
              }));

              return (
                <div key={model.id} className="ai-models-card-wrapper">
                  <div
                    onClick={() => handleCardClick(model)}
                    style={{ cursor: "pointer" }}
                    className="h-full"
                  >
                    <Card
                      title={model.displayName}
                      // description={`${modelTypeLabels[model.modelType] || model.modelType} - Version ${model.version}`}
                      variation="collapsed"
                      iconColor="highlight"
                      metadataContent={metadataContent}
                      // footerContent={footerContent}
                      type={type}
                      tag={model.tags || []}
                      hover="shadowHighlight"
                      shadow="light"
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
    </>
  );
};

export default AIModelsPage;
