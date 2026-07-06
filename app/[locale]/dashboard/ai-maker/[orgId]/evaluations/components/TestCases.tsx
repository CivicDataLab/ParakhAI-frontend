"use client";

import { useGraphQL } from "@/lib/graphql-client";
import { toTitleCase, stripMarkdown } from "@/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { IconAlertCircleFilled, IconPencil, IconTrash } from "@tabler/icons-react";
import { Button, DataTable, Icon, Spinner, Text, Tooltip } from "opub-ui";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import AddPromptRowModal from "./AddPromptRowModal";
import EditPromptRowSheet from "./EditPromptRowSheet";
import {
  countUsablePrompts,
  MIN_USABLE_PROMPTS_PER_METRIC,
  type PromptCoverageSource,
} from "./promptCoverage";
import PromptSelectionModal from "./PromptSelectionModal";
import type {
  CustomPromptRow,
  PromptDataset,
  PromptLibrarySelection,
  PromptLibrarySelectionMap,
  SelectOption,
} from "./types";

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

/** Column names a custom prompt row can provide, in `mandatoryInputs` naming. */
const CUSTOM_ROW_COLUMNS = [
  "input",
  "input_prompt",
  "expected_output",
  "reference_output",
  "category",
  "risk_type",
];

const getCustomPromptColumnValue = (
  row: CustomPromptRow,
  columnName: string,
): string => {
  const normalized = columnName.trim().toLowerCase();

  switch (normalized) {
    case "input":
    case "input_prompt":
      return row.input;
    case "expected_output":
    case "reference_output":
      return row.expectedOutput;
    case "category":
      return row.category;
    case "risk_type":
    case "risktype":
      return row.riskType;
    default:
      return "";
  }
};

const collectSelectedMetrics = (
  selectedModules: Record<string, boolean>,
  selectedMetrics: Record<string, SelectOption[]>,
): Array<{ metricLabel: string; mandatoryInputs: string[] }> => {
  const result: Array<{ metricLabel: string; mandatoryInputs: string[] }> = [];

  Object.entries(selectedModules).forEach(([moduleName, isSelected]) => {
    if (!isSelected) return;

    const metrics = selectedMetrics[moduleName];
    if (!Array.isArray(metrics)) return;

    metrics.forEach((metric) => {
      result.push({
        metricLabel: metric.label,
        mandatoryInputs: metric.mandatoryInputs || [],
      });
    });
  });

  return result;
};

const getDatasetSchemaFieldNames = (
  resources?: Array<{ schema?: Array<{ fieldName: string }> }>,
): string[] =>
  Array.from(
    new Set(
      (resources ?? []).flatMap((r) => (r.schema ?? []).map((f) => f.fieldName))
    )
  );

interface TestCasesProps {
  /** Organization whose DataSpace prompt datasets to load (route org or assignment org). */
  orgId: string;
  promptRowSelections: PromptLibrarySelectionMap;
  setPromptRowSelections: Dispatch<SetStateAction<PromptLibrarySelectionMap>>;
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
  /** Reports which columns the current prompt selection covers, so the metric
   *  dropdowns can show per-metric usable prompt counts. */
  onPromptCoverageChange?: (sources: PromptCoverageSource[]) => void;
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
  promptRowSelections,
  setPromptRowSelections,
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
  onPromptCoverageChange,
}) => {
  const { request, isAuthenticated } = useGraphQL();
  const [promptDatasets, setPromptDatasets] = useState<PromptDataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);
  const [customPromptRows, setCustomPromptRows] = useState<CustomPromptRow[]>(
    () => parsePastedTestCases(pastedTestCases),
  );
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [isEditRowSheetOpen, setIsEditRowSheetOpen] = useState(false);
  const [editingPromptRow, setEditingPromptRow] = useState<CustomPromptRow | null>(
    null,
  );
  const [customPromptTableKey, setCustomPromptTableKey] = useState(0);
  const [activePromptModalDataset, setActivePromptModalDataset] =
    useState<PromptDataset | null>(null);

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

  const handleOpenEditPromptRow = useCallback((row: CustomPromptRow) => {
    setEditingPromptRow(row);
    setIsEditRowSheetOpen(true);
  }, []);

  const handleEditPromptRow = useCallback(
    (rowId: string, rowData: Omit<CustomPromptRow, "id" | "selected">) => {
      updateCustomPromptRows(
        customPromptRows.map((row) =>
          row.id === rowId ? { ...row, ...rowData } : row,
        ),
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
  const hasPromptLibraries = Object.values(promptRowSelections).some(
    (s) => s.rowIds.length > 0 || s.isLegacyPlaceholder,
  );
  const hasCustomTestCases = customPromptRows.some(
    (row) => row.input.trim().length > 0,
  );
  const hasTestCases =
    testSourceMode === "library" ? hasPromptLibraries : hasCustomTestCases;
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
          schemaFieldNames: getDatasetSchemaFieldNames(ds.resources),
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

  const totalSelectedPromptCount = useMemo(
    () =>
      Object.values(promptRowSelections).reduce(
        (sum, s) => sum + (s.isLegacyPlaceholder ? 0 : s.rowIds.length),
        0,
      ),
    [promptRowSelections],
  );

  const selectedLibraryDatasets = useMemo(
    () =>
      promptDatasets.filter(
        (ds) => (promptRowSelections[ds.id]?.rowIds.length ?? 0) > 0,
      ),
    [promptDatasets, promptRowSelections],
  );

  const promptCoverageSources = useMemo<PromptCoverageSource[]>(() => {
    if (testSourceMode === "library") {
      return selectedLibraryDatasets.map((dataset) => {
        const selection = promptRowSelections[dataset.id];
        return {
          // Prefer the prompts API's real column names (captured when rows were
          // picked); the GraphQL schema fieldNames can be missing or misnamed.
          fields: selection?.availableColumns ?? dataset.schemaFieldNames,
          count: selection?.rowIds.length ?? 0,
        };
      });
    }

    // Group custom rows by which columns they actually fill in.
    const groups = new Map<string, PromptCoverageSource>();
    customPromptRows
      .filter((row) => row.input.trim())
      .forEach((row) => {
        const fields = CUSTOM_ROW_COLUMNS.filter((col) =>
          getCustomPromptColumnValue(row, col).trim(),
        );
        const key = fields.join("|");
        const group = groups.get(key);
        if (group) {
          group.count += 1;
        } else {
          groups.set(key, { fields, count: 1 });
        }
      });
    return Array.from(groups.values());
  }, [testSourceMode, selectedLibraryDatasets, promptRowSelections, customPromptRows]);

  // A metric only blocks the run when fewer than MIN_USABLE_PROMPTS_PER_METRIC
  // of the selected prompts provide all its mandatory columns. Prompts missing
  // them are fine as long as enough others have them — the backend runs each
  // metric only on the prompts it can use.
  const insufficientMetrics = useMemo(
    () =>
      collectSelectedMetrics(selectedModules, selectedMetrics)
        .map((metric) => ({
          ...metric,
          usableCount: countUsablePrompts(
            promptCoverageSources,
            metric.mandatoryInputs,
          ),
        }))
        .filter((metric) => metric.usableCount < MIN_USABLE_PROMPTS_PER_METRIC),
    [selectedModules, selectedMetrics, promptCoverageSources],
  );

  const selectedPromptCountForMode =
    testSourceMode === "library" ? totalSelectedPromptCount : selectedCustomPromptCount;
  // With nothing selected yet, the "please select..." validation already covers
  // both the disabled button and the explanation — no warnings on top of it.
  const hasTooFewPrompts =
    selectedPromptCountForMode > 0 &&
    selectedPromptCountForMode < MIN_USABLE_PROMPTS_PER_METRIC;
  const hasInsufficientMetricCoverage =
    selectedPromptCountForMode >= MIN_USABLE_PROMPTS_PER_METRIC &&
    insufficientMetrics.length > 0;
  // The limit shrinks when more metrics are selected, so an existing selection
  // can end up over it even though the checkboxes prevent adding past the cap.
  const isOverPromptLimit = selectedPromptCountForMode > maxInputPrompts;
  const overLimitError = isOverPromptLimit
    ? `You've selected ${selectedPromptCountForMode} prompts, but your current metric selection allows ${maxInputPrompts}. Unselect prompts to run the evaluation.`
    : undefined;
  const isRunEvaluationDisabled =
    isRequestingAudit ||
    !hasTestCases ||
    hasTooFewPrompts ||
    hasInsufficientMetricCoverage ||
    isOverPromptLimit;
  const runEvaluationButtonClassName = isRunEvaluationDisabled
    ? "!rounded-[8px] !cursor-not-allowed !border-none !bg-[#8c949d] !text-white hover:!bg-[#8c949d] hover:!text-white px-8 py-3 text-base font-bold"
    : "!rounded-[8px] !border-none !bg-primaryPurple2 px-8 py-3 text-base font-bold !text-white hover:!bg-[#6849EE] hover:!text-white";

  const handleOpenPromptSelectionModal = useCallback((dataset: PromptDataset) => {
    setActivePromptModalDataset(dataset);
  }, []);

  const handleChangeLibrarySelection = useCallback(
    (next: PromptLibrarySelection) => {
      setPromptRowSelections((prev) => {
        const nextMap = { ...prev };
        if (next.rowIds.length === 0) {
          delete nextMap[next.datasetId];
        } else {
          nextMap[next.datasetId] = next;
        }
        return nextMap;
      });
    },
    [setPromptRowSelections],
  );

  const promptDatasetColumns: ColumnDef<PromptDataset>[] = useMemo(
    () => [
    {
      accessorKey: "title",
      header: "Name",
      enableSorting: true,
      cell: ({ row, getValue }) => {
        const dataspaceUrl = process.env.NEXT_PUBLIC_DATASPACE_URL?.replace(/\/$/, "");
        return (
          <a
            href={`${dataspaceUrl}/datasets/${row.original.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-purple hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {getValue<string>()}
          </a>
        );
      },
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
      id: "promptCount",
      header: "Prompt Count",
      enableSorting: false,
      cell: ({ row }) => {
        const selection = promptRowSelections[String(row.original.id)];
        return selection && !selection.isLegacyPlaceholder ? selection.rowIds.length : 0;
      },
    },
    {
      id: "selectedPrompts",
      header: "Selected Prompts",
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          kind="secondary"
          size="slim"
          className="!rounded-[8px]"
          onClick={(event) => {
            event.stopPropagation();
            handleOpenPromptSelectionModal(row.original);
          }}
        >
          View
        </Button>
      ),
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
    [promptRowSelections, handleOpenPromptSelectionModal]
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
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="custom-prompt-row-actions">
            <button
              type="button"
              aria-label="Edit prompt row"
              onClick={(event) => {
                event.stopPropagation();
                handleOpenEditPromptRow(row.original);
              }}
              className="custom-prompt-action-button"
            >
              <Icon source={IconPencil} size={18} />
            </button>
            <button
              type="button"
              aria-label="Delete prompt row"
              onClick={(event) => {
                event.stopPropagation();
                handleDeletePromptRow(row.original.id);
              }}
              className="custom-prompt-action-button custom-prompt-delete-button"
            >
              <Icon source={IconTrash} size={18} />
            </button>
          </div>
        ),
      },
    ],
    [handleDeletePromptRow, handleOpenEditPromptRow],
  );

  const runsLine: string | null = (() => {
    if (selectedSubModuleCount === 0) {
      return "This limit adjusts based on how many sub-modules you've chosen.";
    }
    if (testSourceMode === "library" && totalSelectedPromptCount > 0) {
      const plural = totalSelectedPromptCount === 1 ? "" : "s";
      return `ParakhAI will run the ${totalSelectedPromptCount} prompt${plural} you've selected across your chosen libraries.`;
    }
    return null;
  })();

  const promptWord = testSourceMode === "library" ? "selected" : "added";
  const insufficientMetricsWarning = (() => {
    // While libraries are still loading, coverage is unknown — stay quiet.
    if (testSourceMode === "library" && isLoadingDatasets) return null;

    if (hasTooFewPrompts) {
      return (
        <div className="mt-4 space-y-1">
          <Text variant="bodySm" color="critical">
            Select at least {MIN_USABLE_PROMPTS_PER_METRIC} prompts to run the
            evaluation — only {selectedPromptCountForMode} {promptWord} so far.
          </Text>
        </div>
      );
    }

    if (!hasInsufficientMetricCoverage) return null;

    return (
      <div className="mt-4 space-y-1">
        {insufficientMetrics.map(({ metricLabel, mandatoryInputs, usableCount }) => (
          <Text key={metricLabel} variant="bodySm" color="critical">
            Warning: <strong>{metricLabel}</strong> requires column(s){" "}
            <strong>{mandatoryInputs.join(", ")}</strong> —{" "}
            {usableCount === 0 ? "none" : `only ${usableCount}`} of your{" "}
            {promptWord} prompts {usableCount === 1 ? "provides" : "provide"}{" "}
            them (minimum {MIN_USABLE_PROMPTS_PER_METRIC}).
          </Text>
        ))}
      </div>
    );
  })();

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
        {runsLine && (
          <Text variant="bodySm" className="text-gray-800">
            {runsLine}
          </Text>
        )}
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
        {!isLoadingDatasets && !datasetsError && promptDatasets.length > 0 && (
          <div className="flex justify-end mt-2">
            <Text
              variant="bodySm"
              fontWeight="medium"
              color={totalSelectedPromptCount >= maxInputPrompts ? "critical" : "subdued"}
            >
              {totalSelectedPromptCount} / {maxInputPrompts} selected
            </Text>
          </div>
        )}
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
            rows={promptDatasets}
            columns={promptDatasetColumns}
            hideSelection
            hideFooter={promptDatasets.length <= 10}
          />
        )}
        </div>
        {insufficientMetricsWarning}
      </div>

      {submoduleWarningBanner}

      {activePromptModalDataset && (
        <PromptSelectionModal
          open={!!activePromptModalDataset}
          onOpenChange={(isOpen) => {
            if (!isOpen) setActivePromptModalDataset(null);
          }}
          dataset={activePromptModalDataset}
          orgId={orgId}
          maxInputPrompts={maxInputPrompts}
          globalSelectedCount={totalSelectedPromptCount}
          librarySelection={promptRowSelections[activePromptModalDataset.id]}
          onChangeLibrarySelection={handleChangeLibrarySelection}
        />
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

            {insufficientMetricsWarning}
          </div>

          {submoduleWarningBanner}

          <AddPromptRowModal
            open={isAddRowModalOpen}
            onOpenChange={setIsAddRowModalOpen}
            categoryOptions={categoryOptions}
            onSubmit={handleSubmitPromptRow}
          />

          <EditPromptRowSheet
            row={editingPromptRow}
            open={isEditRowSheetOpen}
            onOpenChange={setIsEditRowSheetOpen}
            categoryOptions={categoryOptions}
            onSubmit={handleEditPromptRow}
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
      {(validationError ?? overLimitError) && (
        <div className="mt-4 text-center">
          <Text variant="bodySm" className="text-red-600" color="critical">
            {validationError ?? overLimitError}
          </Text>
        </div>
      )}
    </div>
  );
};

export default TestCases;
