"use client";

import { Icons } from "@/components/icons";
import { useGraphQL } from "@/lib/api";
import { toTitleCase } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { IconTrash } from "@tabler/icons-react";
import { Button, DataTable, Icon, Spinner, Text } from "opub-ui";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import AddPromptRowModal from "./AddPromptRowModal";
import RecommendationModal from "./manual-evaluation/RecommendationModal";
import type { CustomPromptRow, SelectOption } from "./types";

const MAX_SUBMODULES_PER_EVALUATION = 10;
const MAX_TASKS_PER_EVALUATION = 200;

const createPromptRow = (
  data: Omit<CustomPromptRow, "id" | "selected">,
): CustomPromptRow => ({
  id: `prompt-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  ...data,
  selected: true,
});

const parsePastedTestCases = (value: string): CustomPromptRow[] => {
  if (!value.trim()) return [];

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [input = "", expectedOutput = "", category = "", riskType = ""] = line
        .split(",")
        .map((part) => part.trim());

      return {
        id: `prompt-row-restored-${index}`,
        input,
        expectedOutput,
        category,
        riskType,
        selected: true,
      };
    });
};

const serializeCustomPromptRows = (rows: CustomPromptRow[]) =>
  rows
    .filter(
      (row) =>
        row.input.trim() ||
        row.expectedOutput.trim() ||
        row.category.trim() ||
        row.riskType.trim(),
    )
    .map((row) =>
      [row.input, row.expectedOutput, row.category, row.riskType].join(", "),
    )
    .join("\n");

type PromptDataset = {
  id: string;
  title: string;
  description?: string;
  taskType?: string;
  domain?: string;
  resourceCount: number;
  promptFormat?: string;
};

interface TestCasesProps {
  /** Organization whose DataSpace prompt datasets to load (route org or assignment org). */
  orgId: string;
  selectedPromptLibraries: any[];
  setSelectedPromptLibraries: (selected: any[]) => void;
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  domain?: string | null;
  pastedTestCases: string;
  setPastedTestCases: (value: string) => void;
  testInputMode: "paste" | "upload";
  setTestInputMode: (mode: "paste" | "upload") => void;
  testSourceMode: "library" | "custom";
  setTestSourceMode: (mode: "library" | "custom") => void;
  selectedModules: Record<string, boolean>;
  selectedMetrics: Record<string, SelectOption[]>;
  onRunAudit: (recommendation: string) => Promise<boolean>;
  isRequestingAudit: boolean;
}

const PROMPT_DATASETS_QUERY = `
  query GetPromptDatasets($limit: Int, $isPublic: Boolean, $domain: String) {
    promptDatasets(limit: $limit, isPublic: $isPublic,domain: $domain) {
      id
      title
      description
      promptMetadata {
        taskType
        domain
        targetLanguages
      }
      resources {
        id
        name
        promptFormat
        promptCount
      }
    }
  }
`;

const TestCases: React.FC<TestCasesProps> = ({
  orgId,
  selectedPromptLibraries,
  setSelectedPromptLibraries,
  uploadedFiles,
  setUploadedFiles,
  domain,
  pastedTestCases,
  setPastedTestCases,
  testInputMode,
  setTestInputMode,
  testSourceMode,
  setTestSourceMode,
  selectedModules,
  selectedMetrics,
  onRunAudit,
  isRequestingAudit,
}) => {
  const { request, isAuthenticated } = useGraphQL();
  const [promptDatasets, setPromptDatasets] = useState<PromptDataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);
  const [tableRenderKey, setTableRenderKey] = useState(0);
  const [customPromptRows, setCustomPromptRows] = useState<CustomPromptRow[]>(
    () => parsePastedTestCases(pastedTestCases),
  );
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [customPromptTableKey, setCustomPromptTableKey] = useState(0);
  const [showRunEvaluationModal, setShowRunEvaluationModal] = useState(false);

  const handleRunEvaluationSubmit = async (recommendation: string) => {
    const started = await onRunAudit(recommendation);
    if (started) {
      setShowRunEvaluationModal(false);
    }
  };

  const selectedSubModuleCount = useMemo(
    () =>
      Object.entries(selectedModules).reduce((count, [moduleName, isSelected]) => {
        if (!isSelected) return count;
        const metrics = selectedMetrics[moduleName];
        return count + (Array.isArray(metrics) ? metrics.length : 0);
      }, 0),
    [selectedModules, selectedMetrics],
  );

  const maxInputPrompts =
    selectedSubModuleCount > 0
      ? Math.floor(MAX_TASKS_PER_EVALUATION / selectedSubModuleCount)
      : MAX_TASKS_PER_EVALUATION;

  const selectedCustomPromptCount = useMemo(
    () =>
      customPromptRows.filter((row) => row.input.trim().length > 0).length,
    [customPromptRows],
  );

  const updateCustomPromptRows = useCallback(
    (nextRows: CustomPromptRow[]) => {
      setCustomPromptRows(nextRows);
      setPastedTestCases(serializeCustomPromptRows(nextRows));
    },
    [setPastedTestCases],
  );

  const handleDeletePromptRow = useCallback(
    (rowId: string) => {
      updateCustomPromptRows(
        customPromptRows.filter((row) => row.id !== rowId),
      );
      setCustomPromptTableKey((prev) => prev + 1);
    },
    [customPromptRows, updateCustomPromptRows],
  );

  const categoryOptions = useMemo(() => {
    const options: SelectOption[] = [];

    Object.entries(selectedModules).forEach(([moduleName, isSelected]) => {
      if (!isSelected) return;

      const metrics = selectedMetrics[moduleName];
      if (!Array.isArray(metrics)) return;

      metrics.forEach((metric) => {
        if (!options.some((option) => option.value === metric.value)) {
          options.push(metric);
        }
      });
    });

    return options;
  }, [selectedModules, selectedMetrics]);

  const categoryLabelByValue = useMemo(
    () =>
      Object.fromEntries(
        categoryOptions.map((option) => [option.value, option.label]),
      ),
    [categoryOptions],
  );

  const riskTypeLabelByValue = useMemo(
    () => ({
      high: "High",
      medium: "Medium",
      low: "Low",
    }),
    [],
  );

  const getOptionLabel = (
    value: string,
    labels: Record<string, string>,
  ) => labels[value] || toTitleCase(value.replace(/_/g, " "));

  const handleOpenAddRowModal = useCallback(() => {
    if (selectedCustomPromptCount >= maxInputPrompts) return;
    setIsAddRowModalOpen(true);
  }, [maxInputPrompts, selectedCustomPromptCount]);

  const handleSubmitPromptRow = useCallback(
    (rowData: Omit<CustomPromptRow, "id" | "selected">) => {
      updateCustomPromptRows([...customPromptRows, createPromptRow(rowData)]);
      setCustomPromptTableKey((prev) => prev + 1);
    },
    [customPromptRows, updateCustomPromptRows],
  );

  useEffect(() => {
    if (testSourceMode !== "custom") return;
    if (customPromptRows.length > 0 || !pastedTestCases.trim()) return;
    setCustomPromptRows(parsePastedTestCases(pastedTestCases));
  }, [testSourceMode, pastedTestCases, customPromptRows.length]);

  // Validation: Check if at least one test case source is provided
  const hasPromptLibraries = selectedPromptLibraries.length > 0;
  const hasCustomTestCases = customPromptRows.some(
    (row) => row.input.trim().length > 0,
  );
  const hasTestCases =
    testSourceMode === "library" ? hasPromptLibraries : hasCustomTestCases;
  const isRunEvaluationDisabled = isRequestingAudit || !hasTestCases;
  const runEvaluationButtonClassName = isRunEvaluationDisabled
    ? "!rounded-[8px] !cursor-not-allowed !border-none !bg-[#8c949d] !text-white hover:!bg-[#8c949d] hover:!text-white px-8 py-3 text-base font-bold"
    : "!rounded-[8px] !border-none !bg-primaryPurple2 px-8 py-3 text-base font-bold !text-white hover:!bg-[#6849EE] hover:!text-white";
  const validationError = !hasTestCases
    ? testSourceMode === "library"
      ? "Please select a prompt library to run the evaluation"
      : "Please add at least one custom prompt with an input to run the evaluation"
    : undefined;

  // Fetch prompt datasets from DataSpace
  useEffect(() => {
    if (!isAuthenticated || !orgId) return;

    const fetchPromptDatasets = async () => {
      try {
        setIsLoadingDatasets(true);
        setDatasetsError(null);

        const data = await request<{
          promptDatasets: Array<{
            id: string;
            title: string;
            description?: string;
            promptMetadata?: {
              taskType?: string;
              domain?: string;
              targetLanguages?: string[];
            };
            resources: Array<{
              id: string;
              name: string;
              promptFormat?: string;
              promptCount?: number;
            }>;
          }>;
        }>(PROMPT_DATASETS_QUERY, {
          limit: 50,
          isPublic: true,
          domain: domain || null,
        }, { organization: orgId });

        const datasets = data?.promptDatasets || [];
        const formatted: PromptDataset[] = datasets.map((ds) => ({
          id: ds.id,
          title: ds.title,
          description: ds.description,
          taskType: ds.promptMetadata?.taskType,
          domain: ds.promptMetadata?.domain,
          resourceCount: ds.resources?.length || 0,
          promptFormat: ds.resources?.[0]?.promptFormat,
        }));

        setPromptDatasets(formatted);
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to load prompt datasets";
        setDatasetsError(errorMessage);
        console.error("Error fetching prompt datasets:", error);
      } finally {
        setIsLoadingDatasets(false);
      }
    };

    fetchPromptDatasets();
  }, [isAuthenticated, request, domain, orgId]);

  useEffect(() => {
    if (!promptDatasets.length || !selectedPromptLibraries.length) return;

    const selectedIds = selectedPromptLibraries
      .map((item: any) => item?.id)
      .filter(Boolean);
    if (!selectedIds.length) return;
    const selectedIdSet = new Set(
      selectedIds.map((id: string | number) => String(id))
    );

    const resolved = promptDatasets.filter((dataset) =>
      selectedIdSet.has(String(dataset.id))
    );

    const currentHasTitles = selectedPromptLibraries.every(
      (item: any) => typeof item?.title === "string" && item.title.length > 0
    );

    // Restore whatever saved datasets are currently available in the loaded table.
    // Saved IDs can include entries filtered out by domain, so don't require full-length match.
    if (resolved.length > 0 && !currentHasTitles) {
      setSelectedPromptLibraries([resolved[0]] as any[]);
      setTableRenderKey((prev) => prev + 1);
    }
  }, [promptDatasets, selectedPromptLibraries, setSelectedPromptLibraries]);

  // Enforce single prompt library selection for drafts saved with multiple IDs.
  useEffect(() => {
    if (selectedPromptLibraries.length <= 1) return;
    setSelectedPromptLibraries([selectedPromptLibraries[0]]);
  }, [selectedPromptLibraries, setSelectedPromptLibraries]);

  const selectedLibraryId =
    selectedPromptLibraries[0]?.id != null
      ? String(selectedPromptLibraries[0].id)
      : null;

  const handlePromptLibrarySelect = useCallback(
    (dataset: PromptDataset) => {
      const datasetId = String(dataset.id);
      if (selectedLibraryId === datasetId) {
        setSelectedPromptLibraries([]);
        return;
      }
      setSelectedPromptLibraries([dataset]);
    },
    [selectedLibraryId, setSelectedPromptLibraries]
  );

  const promptDatasetColumns: ColumnDef<PromptDataset>[] = useMemo(
    () => [
    {
      id: "select",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const dataset = row.original;
        const datasetId = String(dataset.id);
        const isSelected = selectedLibraryId === datasetId;
        const isDisabled = selectedLibraryId !== null && !isSelected;

        return (
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isDisabled}
            aria-label={`Select ${dataset.title}`}
            onChange={(event) => {
              event.stopPropagation();
              handlePromptLibrarySelect(dataset);
            }}
            onClick={(event) => event.stopPropagation()}
            className="prompt-library-row-checkbox h-4 w-4 accent-[#644fc1] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          />
        );
      },
    },
    {
      accessorKey: "title",
      header: "Name",
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="text-primary-purple">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "domain",
      header: "Sector",
      cell: ({ getValue }) => {
        const value = getValue<string>();
        return value ? toTitleCase(value) : "Sector Name";
      },
    },
    {
      accessorKey: "taskType",
      header: "Module",
      cell: ({ getValue }) => {
        const value = getValue<string>();
        return value
          ? toTitleCase(value.replace(/_/g, " "))
          : "All Modules";
      },
    },
    {
      id: "owner",
      header: "Owner",
      enableSorting: false,
      cell: () => "ParakhAI",
    },
  ],
    [handlePromptLibrarySelect, selectedLibraryId]
  );

  const customPromptColumns: ColumnDef<CustomPromptRow>[] = useMemo(
    () => [
      {
        accessorKey: "input",
        header: "Input",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Text variant="bodySm" className="text-gray-900">
            {getValue<string>() || "--"}
          </Text>
        ),
      },
      {
        accessorKey: "expectedOutput",
        header: "Expected Output",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Text variant="bodySm" className="text-gray-900">
            {getValue<string>() || "--"}
          </Text>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Text variant="bodySm" className="text-gray-900">
            {getOptionLabel(getValue<string>(), categoryLabelByValue)}
          </Text>
        ),
      },
      {
        accessorKey: "riskType",
        header: "Risk Type",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Text variant="bodySm" className="text-gray-900">
            {getOptionLabel(getValue<string>(), riskTypeLabelByValue)}
          </Text>
        ),
      },
      {
        id: "delete",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            aria-label="Delete prompt row"
            onClick={(event) => {
              event.stopPropagation();
              handleDeletePromptRow(row.original.id);
            }}
            className="custom-prompt-delete-button"
          >
            <Icon source={IconTrash} size={18} />
          </button>
        ),
      },
    ],
    [categoryLabelByValue, handleDeletePromptRow, riskTypeLabelByValue],
  );

  const submoduleWarningBanner = (
    copy: React.ReactNode,
  ) => (
    <div className="prompt-library-warning-banner">
      <Icon
        source={Icons.alert}
        size={18}
        className="prompt-library-warning-banner__icon flex-shrink-0"
      />
      <div className="prompt-library-warning-banner__content space-y-1">
        <Text variant="bodySm" fontWeight="semibold" className="text-gray-900">
          Number of sub-modules selected: {selectedSubModuleCount}/
          {MAX_SUBMODULES_PER_EVALUATION}
        </Text>
        <Text variant="bodySm" fontWeight="semibold" className="text-gray-900">
          Maximum Tasks per Evaluation: {MAX_TASKS_PER_EVALUATION}
        </Text>
        <Text variant="bodySm" className="text-gray-800">
          One task is one input run across one selected sub-module
        </Text>
        <Text variant="bodySm" className="text-gray-800">
          {copy}
        </Text>
      </div>
    </div>
  );

  return (
    <div className="mb-8 space-y-8">
      <div className="space-y-4">
        <Text
          variant="bodyMd"
          fontWeight="medium"
          className="test-cases-section-label"
        >
          Test Cases and Prompts
          <span className="required-asterisk">*</span>
        </Text>

        <div className="flex gap-6 flex-wrap">
          <label className="flex flex-1 min-w-[240px] items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="testSourceMode"
              value="library"
              checked={testSourceMode === "library"}
              onChange={() => setTestSourceMode("library")}
              className="mt-1 h-4 w-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
            />
            <div className="flex-1">
              <Text variant="bodyMd" fontWeight="semibold" className="text-gray-900">
                Select from premade libraries
              </Text>
              <Text variant="bodySm" className="text-gray-600 block">
                Select a pre-made prompt datasets curated for your evaluation
                scope (healthcare etc.)
              </Text>
            </div>
          </label>

          <label className="flex flex-1 min-w-[240px] items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="testSourceMode"
              value="custom"
              checked={testSourceMode === "custom"}
              onChange={() => setTestSourceMode("custom")}
              className="mt-1 h-4 w-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
            />
            <div className="flex-1">
              <Text variant="bodyMd" fontWeight="semibold" className="text-gray-900">
                Add your own prompts
              </Text>
              <Text variant="bodySm" className="text-gray-600 block">
                Add a set of your own input prompts to test using AI assistance
              </Text>
            </div>
          </label>
        </div>
      </div>

      {testSourceMode === "library" && (
      <>
      <div className="select-prompt-library-section mt-2">
        <Text
          variant="headingMd"
          className="select-prompt-library-heading block"
        >
          Select from pre-made prompt libraries
        </Text>
        <div className="test-cases-table">
        {isLoadingDatasets ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Spinner />
            <Text variant="bodySm" className="text-gray-600">
              Loading prompt datasets...
            </Text>
          </div>
        ) : datasetsError ? (
          <div className="py-8 text-center">
            <Text variant="bodySm" className="text-red-600">
              {datasetsError}
            </Text>
          </div>
        ) : promptDatasets.length === 0 ? (
          <div className="py-8 text-center">
            <Text variant="bodySm" className="text-gray-600">
              No prompt libraries available for the selected domain. Please
              cancel this evaluation and start a new one for a different domain.
            </Text>
          </div>
        ) : (
          <DataTable
            key={tableRenderKey}
            rows={promptDatasets}
            columns={promptDatasetColumns}
            hideSelection
            hideFooter={promptDatasets.length <= 10}
          />
        )}
        </div>
      </div>

      {submoduleWarningBanner(
        <>
          A maximum of{" "}
          <strong className="font-semibold text-gray-900">
            {maxInputPrompts} input prompts
          </strong>{" "}
          will be taken from your selected prompt library. To run more prompts,
          unselect some sub-modules.
        </>,
      )}
      </>
      )}

      {testSourceMode === "custom" && (
        <>
          <div className="custom-prompts-section select-prompt-library-section mt-2">
            <Text
              variant="headingMd"
              className="select-prompt-library-heading block"
            >
              Add your own prompts
            </Text>

            <div className="test-cases-table custom-prompts-table">
              {customPromptRows.length === 0 ? (
                <div className="custom-prompts-empty-cell">
                  <Text variant="bodySm" className="text-gray-500">
                    Add an issue to enter your own prompt.
                  </Text>
                </div>
              ) : (
                <DataTable
                  key={customPromptTableKey}
                  rows={customPromptRows}
                  columns={customPromptColumns}
                  hideSelection
                  hideFooter={customPromptRows.length <= 10}
                />
              )}
            </div>

            <div className="custom-prompts-add-row">
              <Button
                kind="secondary"
                onClick={handleOpenAddRowModal}
                disabled={selectedCustomPromptCount >= maxInputPrompts}
                className="!rounded-[8px]"
              >
                Add an issue
              </Button>
              {selectedCustomPromptCount >= maxInputPrompts && (
                <Text variant="bodySm" className="text-gray-600">
                  Maximum of {maxInputPrompts} input prompts reached. Unselect
                  some sub-modules to add more.
                </Text>
              )}
            </div>
          </div>

          {submoduleWarningBanner(
            <>
              In the next step, you can select a maximum of{" "}
              <strong className="font-semibold text-gray-900">
                {maxInputPrompts} input prompts
              </strong>
              . To run more prompts, unselect some sub-modules.
            </>,
          )}

          <AddPromptRowModal
            open={isAddRowModalOpen}
            onOpenChange={setIsAddRowModalOpen}
            categoryOptions={categoryOptions}
            onSubmit={handleSubmitPromptRow}
          />
        </>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-center gap-6 pt-8 border-t border-gray-200">
        <Button
          kind="primary"
          onClick={() => {
            if (!isRunEvaluationDisabled) {
              setShowRunEvaluationModal(true);
            }
          }}
          disabled={isRunEvaluationDisabled}
          className={`run-evaluation-button ${runEvaluationButtonClassName}`}
        >
          <span className="run-evaluation-button__content">
            <span className="run-evaluation-button__label">
              {isRequestingAudit ? "Running…" : "Run Evaluation"}
            </span>
            <img
              src="/images/icons/circle-arrow-right.png"
              alt=""
              width={18}
              height={18}
              className="run-evaluation-button__icon"
              aria-hidden
            />
          </span>
        </Button>
      </div>
      {validationError && (
        <div className="mt-4 text-center">
          <Text variant="bodySm" className="text-red-600" color="critical">
            {validationError}
          </Text>
        </div>
      )}

      <RecommendationModal
        open={showRunEvaluationModal}
        onOpenChange={setShowRunEvaluationModal}
        title="Evaluation Recommendation"
        description="Once you run your evaluation, you cannot change your selections. Enter your recommendation for this evaluation (optional)."
        placeholder="Enter your recommendation for this evaluation (optional)"
        onSubmit={handleRunEvaluationSubmit}
        isSubmitting={isRequestingAudit}
        submitButtonText="Run Evaluation"
      />
    </div>
  );
};

export default TestCases;
