"use client";

import { useGraphQL } from "@/lib/api";
import { toTitleCase, stripMarkdown } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { IconAlertCircleFilled, IconTrash } from "@tabler/icons-react";
import { Button, DataTable, Icon, Spinner, Text, Tooltip } from "opub-ui";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import AddPromptRowModal from "./AddPromptRowModal";
import type { CustomPromptRow, SelectOption } from "./types";

const MAX_TASKS_PER_EVALUATION = 250;

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
  hasExpectedOutputColumn: boolean;
  testCaseCount: number;
};

const isMisinformationMetric = (metric: SelectOption) => {
  const label = metric.label.trim().toLowerCase();
  const value = metric.value.trim().toLowerCase();

  return (
    label === "misinformation" ||
    label.includes("misinformation") ||
    value === "misinformation" ||
    value.includes("misinformation")
  );
};

const datasetHasExpectedOutputColumn = (
  resources?: Array<{ schema?: Array<{ fieldName: string }> }>,
) =>
  (resources ?? []).some((resource) =>
    (resource.schema ?? []).some(
      (field) => field.fieldName === "expected_output",
    ),
  );

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
  onRunAudit: () => Promise<boolean>;
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
        noOfEntries
        schema {
          fieldName
          format
        }
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

  const handleRunEvaluation = () => {
    void onRunAudit();
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

  const isMisinformationSelected = useMemo(
    () =>
      Object.entries(selectedModules).some(([moduleName, isSelected]) => {
        if (!isSelected) return false;
        const metrics = selectedMetrics[moduleName];
        if (!Array.isArray(metrics)) return false;
        return metrics.some(isMisinformationMetric);
      }),
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
              noOfEntries?: number;
              schema?: Array<{ fieldName: string; format: string }>;
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
          hasExpectedOutputColumn: datasetHasExpectedOutputColumn(ds.resources),
          testCaseCount: ds.resources?.[0]?.noOfEntries || 0,
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

  const showMisinformationSchemaWarning = useMemo(() => {
    if (!isMisinformationSelected || !selectedLibraryId) return false;

    const selectedDataset = promptDatasets.find(
      (dataset) => String(dataset.id) === selectedLibraryId,
    );
    if (!selectedDataset) return false;

    return !selectedDataset.hasExpectedOutputColumn;
  }, [isMisinformationSelected, selectedLibraryId, promptDatasets]);

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
      accessorKey: "testCaseCount",
      header: "No. of Test Cases",
      cell: ({ getValue }) => getValue<number>() || 0,
    },
    {
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      cell: ({ getValue }) => {
        const fullText = stripMarkdown(getValue<string>() || "").trim();
        if (!fullText) return "--";

        return (
          <Tooltip content={fullText}>
            <span className="block max-w-[280px] truncate text-gray-900">
              {fullText}
            </span>
          </Tooltip>
        );
      },
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
    <div className="prompt-library-warning-banner">
      <IconAlertCircleFilled
        size={18}
        className="prompt-library-warning-banner__icon shrink-0"
        aria-hidden
      />
      <div className="prompt-library-warning-banner__content space-y-1">
        <Text variant="bodySm" fontWeight="semibold" className="text-gray-900">
          Maximum test cases for your current selection: {maxInputPrompts}{" "}
          input prompts
        </Text>
        <Text variant="bodySm" className="text-gray-800">
          This is the number of input prompts ParakhAI will run from the
          selected library. This limit adjusts based on how many sub-modules
          you&apos;ve chosen.
        </Text>
        <Text variant="bodySm" className="text-gray-800">
          The test case limit helps keep evaluations efficient and reliable.
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
                Select a prompt library
              </Text>
              <Text variant="bodySm" className="text-gray-600 block">
                Select an existing prompt datasets curated for your evaluation
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
        {showMisinformationSchemaWarning && (
          <Text variant="bodySm" color="critical" className="mt-4">
            Warning: The selected library cannot be used with sub-module
            Misinformation because it does not have an expected output column.
          </Text>
        )}
      </div>

      {submoduleWarningBanner}
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

            {customPromptRows.length > 0 && (
              <div className="test-cases-table custom-prompts-table">
                <DataTable
                  key={customPromptTableKey}
                  rows={customPromptRows}
                  columns={customPromptColumns}
                  hideSelection
                  hideFooter={customPromptRows.length <= 10}
                />
              </div>
            )}

            <div className="custom-prompts-add-row">
              <Button
                kind="secondary"
                onClick={handleOpenAddRowModal}
                disabled={selectedCustomPromptCount >= maxInputPrompts}
                className="!rounded-[8px]"
              >
                Add Input Prompt
              </Button>
              {selectedCustomPromptCount >= maxInputPrompts && (
                <Text variant="bodySm" className="text-gray-600">
                  Maximum of {maxInputPrompts} input prompts reached. Unselect
                  some sub-modules to add more.
                </Text>
              )}
            </div>
          </div>

          {submoduleWarningBanner}

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
              handleRunEvaluation();
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
    </div>
  );
};

export default TestCases;
