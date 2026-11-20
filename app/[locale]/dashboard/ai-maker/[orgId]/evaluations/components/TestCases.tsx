'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IconAlertCircleFilled, IconPencil, IconTrash } from '@tabler/icons-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, DataTable, Icon, Spinner, Text, Tooltip } from 'opub-ui';
import { Icons } from '@/components/icons';
import { useGraphQL } from '@/lib/graphql-client';
import { stripMarkdown, toTitleCase } from '@/utils';
import AddPromptRowModal from './AddPromptRowModal';
import EditPromptRowSheet from './EditPromptRowSheet';
import type { CustomPromptRow, SelectOption } from './types';

const MAX_TASKS_PER_EVALUATION = 250;

const createPromptRow = (data: Omit<CustomPromptRow, 'id' | 'selected'>): CustomPromptRow => ({
  id: `prompt-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  ...data,
  selected: true,
});

const parsePastedTestCases = (value: string): CustomPromptRow[] => {
  if (!value.trim()) return [];

  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [input = '', expectedOutput = '', category = '', riskType = ''] = line
        .split(',')
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
        row.input.trim() || row.expectedOutput.trim() || row.category.trim() || row.riskType.trim()
    )
    .map((row) => [row.input, row.expectedOutput, row.category, row.riskType].join(', '))
    .join('\n');

type MissingColumnsByMetric = {
  metricLabel: string;
  missingColumns: string[];
};

const getCustomPromptColumnValue = (row: CustomPromptRow, columnName: string): string => {
  const normalized = columnName.trim().toLowerCase();

  switch (normalized) {
    case 'input':
    case 'input_prompt':
      return row.input;
    case 'expected_output':
    case 'reference_output':
      return row.expectedOutput;
    case 'category':
      return row.category;
    case 'risk_type':
    case 'risktype':
      return row.riskType;
    default:
      return '';
  }
};

const collectMissingColumnsByMetric = (
  selectedModules: Record<string, boolean>,
  selectedMetrics: Record<string, SelectOption[]>,
  getMissingColumnsForMetric: (mandatoryInputs: string[]) => string[]
): MissingColumnsByMetric[] => {
  const result: MissingColumnsByMetric[] = [];

  Object.entries(selectedModules).forEach(([moduleName, isSelected]) => {
    if (!isSelected) return;

    const metrics = selectedMetrics[moduleName];
    if (!Array.isArray(metrics)) return;

    metrics.forEach((metric) => {
      const missing = getMissingColumnsForMetric(metric.mandatoryInputs || []);
      if (missing.length > 0) {
        result.push({ metricLabel: metric.label, missingColumns: missing });
      }
    });
  });

  return result;
};

type PromptDataset = {
  id: string;
  title: string;
  description?: string;
  taskType?: string;
  domain?: string;
  resourceCount: number;
  schemaFieldNames: string[];
  testCaseCount: number;
};

const getDatasetSchemaFieldNames = (
  resources?: Array<{ schema?: Array<{ fieldName: string }> }>
): string[] =>
  Array.from(new Set((resources ?? []).flatMap((r) => (r.schema ?? []).map((f) => f.fieldName))));

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
  testInputMode: 'paste' | 'upload';
  setTestInputMode: (mode: 'paste' | 'upload') => void;
  testSourceMode: 'library' | 'custom';
  setTestSourceMode: (mode: 'library' | 'custom') => void;
  selectedModules: Record<string, boolean>;
  selectedMetrics: Record<string, SelectOption[]>;
  onRunAudit: () => Promise<boolean>;
  isRequestingAudit: boolean;
}

const PROMPT_DATASET_FIELDS = `
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
`;

// One page of prompt datasets (server-side pagination) with the total count
const PROMPT_DATASETS_PAGE_QUERY = `
  query GetPromptDatasetsPage($limit: Int, $offset: Int, $domain: String, $search: String) {
    promptDatasetsPage(limit: $limit, offset: $offset, domain: $domain, search: $search) {
      totalCount
      items {
        ${PROMPT_DATASET_FIELDS}
      }
    }
  }
`;

// Used to restore a saved selection that may not be on the current page
const PROMPT_DATASET_BY_ID_QUERY = `
  query GetPromptDataset($datasetId: ID!) {
    promptDataset(datasetId: $datasetId) {
      ${PROMPT_DATASET_FIELDS}
    }
  }
`;

const PROMPT_LIBRARY_PAGE_SIZE = 10;

type RawPromptDataset = {
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
};

const toPromptDataset = (ds: RawPromptDataset): PromptDataset => ({
  id: ds.id,
  title: ds.title,
  description: ds.description,
  taskType: ds.promptMetadata?.taskType,
  domain: ds.promptMetadata?.domain,
  resourceCount: ds.resources?.length || 0,
  schemaFieldNames: getDatasetSchemaFieldNames(ds.resources),
  testCaseCount: ds.resources?.[0]?.noOfEntries || 0,
});

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
  const [totalPromptDatasets, setTotalPromptDatasets] = useState(0);
  const [datasetsPagination, setDatasetsPagination] = useState({
    limit: PROMPT_LIBRARY_PAGE_SIZE,
    offset: 0,
  });
  const [librarySearch, setLibrarySearch] = useState('');
  const [debouncedLibrarySearch, setDebouncedLibrarySearch] = useState('');
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);
  const [tableRenderKey, setTableRenderKey] = useState(0);
  const [customPromptRows, setCustomPromptRows] = useState<CustomPromptRow[]>(() =>
    parsePastedTestCases(pastedTestCases)
  );
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [isEditRowSheetOpen, setIsEditRowSheetOpen] = useState(false);
  const [editingPromptRow, setEditingPromptRow] = useState<CustomPromptRow | null>(null);
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
    [selectedModules, selectedMetrics]
  );

  const maxInputPrompts =
    selectedSubModuleCount > 0
      ? Math.floor(MAX_TASKS_PER_EVALUATION / selectedSubModuleCount)
      : MAX_TASKS_PER_EVALUATION;

  const selectedCustomPromptCount = useMemo(
    () => customPromptRows.filter((row) => row.input.trim().length > 0).length,
    [customPromptRows]
  );

  const updateCustomPromptRows = useCallback(
    (nextRows: CustomPromptRow[]) => {
      setCustomPromptRows(nextRows);
      setPastedTestCases(serializeCustomPromptRows(nextRows));
    },
    [setPastedTestCases]
  );

  const handleDeletePromptRow = useCallback(
    (rowId: string) => {
      updateCustomPromptRows(customPromptRows.filter((row) => row.id !== rowId));
      setCustomPromptTableKey((prev) => prev + 1);
    },
    [customPromptRows, updateCustomPromptRows]
  );

  const handleOpenEditPromptRow = useCallback((row: CustomPromptRow) => {
    setEditingPromptRow(row);
    setIsEditRowSheetOpen(true);
  }, []);

  const handleEditPromptRow = useCallback(
    (rowId: string, rowData: Omit<CustomPromptRow, 'id' | 'selected'>) => {
      updateCustomPromptRows(
        customPromptRows.map((row) => (row.id === rowId ? { ...row, ...rowData } : row))
      );
      setCustomPromptTableKey((prev) => prev + 1);
    },
    [customPromptRows, updateCustomPromptRows]
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
    (rowData: Omit<CustomPromptRow, 'id' | 'selected'>) => {
      updateCustomPromptRows([...customPromptRows, createPromptRow(rowData)]);
      setCustomPromptTableKey((prev) => prev + 1);
    },
    [customPromptRows, updateCustomPromptRows]
  );

  useEffect(() => {
    if (testSourceMode !== 'custom') return;
    if (customPromptRows.length > 0 || !pastedTestCases.trim()) return;
    setCustomPromptRows(parsePastedTestCases(pastedTestCases));
  }, [testSourceMode, pastedTestCases, customPromptRows.length]);

  // Validation: Check if at least one test case source is provided
  const hasPromptLibraries = selectedPromptLibraries.length > 0;
  const hasCustomTestCases = customPromptRows.some((row) => row.input.trim().length > 0);
  const hasTestCases = testSourceMode === 'library' ? hasPromptLibraries : hasCustomTestCases;
  const validationError = !hasTestCases
    ? testSourceMode === 'library'
      ? 'Please select a prompt library to run the evaluation'
      : 'Please add at least one custom prompt with an input to run the evaluation'
    : undefined;

  // Debounce the library search so typing doesn't fire a request per keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLibrarySearch(librarySearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [librarySearch]);

  // Back to the first page when the domain, organization or search changes
  useEffect(() => {
    setDatasetsPagination((prev) => (prev.offset === 0 ? prev : { ...prev, offset: 0 }));
  }, [domain, orgId, debouncedLibrarySearch]);

  // Fetch the current page of prompt datasets (server-side pagination)
  useEffect(() => {
    if (!isAuthenticated || !orgId) return;

    let cancelled = false;
    const fetchPromptDatasets = async () => {
      try {
        setIsLoadingDatasets(true);
        setDatasetsError(null);

        const data = await request<{
          promptDatasetsPage: { totalCount: number; items: RawPromptDataset[] };
        }>(
          PROMPT_DATASETS_PAGE_QUERY,
          {
            limit: datasetsPagination.limit,
            offset: datasetsPagination.offset,
            domain: domain || null,
            search: debouncedLibrarySearch || null,
          },
          { organization: orgId }
        );
        if (cancelled) return;

        const page = data?.promptDatasetsPage;
        setPromptDatasets((page?.items || []).map(toPromptDataset));
        setTotalPromptDatasets(page?.totalCount || 0);
      } catch (error: any) {
        if (cancelled) return;
        const errorMessage = error?.message || 'Failed to load prompt datasets';
        setDatasetsError(errorMessage);
        console.error('Error fetching prompt datasets:', error);
      } finally {
        if (!cancelled) setIsLoadingDatasets(false);
      }
    };

    fetchPromptDatasets();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    request,
    domain,
    orgId,
    datasetsPagination.limit,
    datasetsPagination.offset,
    debouncedLibrarySearch,
  ]);

  // Restore a saved selection (drafts store only the ID). With server-side
  // pagination the library may not be on the current page, so fetch it by ID.
  useEffect(() => {
    if (!isAuthenticated || !orgId) return;
    const saved = selectedPromptLibraries[0];
    if (!saved?.id) return;
    const hasDetails =
      typeof saved.title === 'string' &&
      saved.title.length > 0 &&
      Array.isArray(saved.schemaFieldNames);
    if (hasDetails) return;

    let cancelled = false;
    const restoreSelection = async () => {
      const onPage = promptDatasets.find((dataset) => String(dataset.id) === String(saved.id));
      if (onPage) {
        setSelectedPromptLibraries([onPage] as any[]);
        setTableRenderKey((prev) => prev + 1);
        return;
      }
      try {
        const data = await request<{ promptDataset: RawPromptDataset | null }>(
          PROMPT_DATASET_BY_ID_QUERY,
          { datasetId: String(saved.id) },
          { organization: orgId }
        );
        if (cancelled || !data?.promptDataset) return;
        setSelectedPromptLibraries([toPromptDataset(data.promptDataset)] as any[]);
        setTableRenderKey((prev) => prev + 1);
      } catch (error) {
        console.error('Error restoring selected prompt library:', error);
      }
    };

    restoreSelection();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    orgId,
    request,
    promptDatasets,
    selectedPromptLibraries,
    setSelectedPromptLibraries,
  ]);

  // Enforce single prompt library selection for drafts saved with multiple IDs.
  useEffect(() => {
    if (selectedPromptLibraries.length <= 1) return;
    setSelectedPromptLibraries([selectedPromptLibraries[0]]);
  }, [selectedPromptLibraries, setSelectedPromptLibraries]);

  const selectedLibraryId =
    selectedPromptLibraries[0]?.id != null ? String(selectedPromptLibraries[0].id) : null;

  // The selected library may be on another page, so prefer the selection itself
  const selectedDataset = useMemo<PromptDataset | null>(() => {
    if (!selectedLibraryId) return null;
    const onPage = promptDatasets.find((ds) => String(ds.id) === selectedLibraryId);
    if (onPage) return onPage;
    const saved = selectedPromptLibraries[0];
    return saved && Array.isArray(saved.schemaFieldNames) ? (saved as PromptDataset) : null;
  }, [selectedLibraryId, promptDatasets, selectedPromptLibraries]);

  const selectedLibraryEntryCount = selectedDataset?.testCaseCount ?? 0;

  const missingColumnsByMetric = useMemo(() => {
    if (!selectedDataset) return [];

    return collectMissingColumnsByMetric(selectedModules, selectedMetrics, (mandatoryInputs) =>
      mandatoryInputs.filter((col) => !selectedDataset.schemaFieldNames.includes(col))
    );
  }, [selectedModules, selectedMetrics, selectedDataset]);

  const missingCustomColumnsByMetric = useMemo(() => {
    const rowsWithInput = customPromptRows.filter((row) => row.input.trim());

    return collectMissingColumnsByMetric(selectedModules, selectedMetrics, (mandatoryInputs) =>
      mandatoryInputs.filter((col) =>
        rowsWithInput.some((row) => !getCustomPromptColumnValue(row, col).trim())
      )
    );
  }, [customPromptRows, selectedModules, selectedMetrics]);

  const hasSchemaConflict =
    (testSourceMode === 'library' && missingColumnsByMetric.length > 0) ||
    (testSourceMode === 'custom' && missingCustomColumnsByMetric.length > 0);
  const isRunEvaluationDisabled = isRequestingAudit || !hasTestCases || hasSchemaConflict;
  const runEvaluationButtonClassName = isRunEvaluationDisabled
    ? '!rounded-[8px] !cursor-not-allowed !border-none !bg-[#8c949d] !text-white hover:!bg-[#8c949d] hover:!text-white px-8 py-3 text-base font-bold'
    : '!rounded-[8px] !border-none !bg-primaryPurple2 px-8 py-3 text-base font-bold !text-white hover:!bg-[#6849EE] hover:!text-white';

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
        id: 'select',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const dataset = row.original;
          const datasetId = String(dataset.id);
          const isSelected = selectedLibraryId === datasetId;

          return (
            <input
              type="radio"
              name="promptLibrary"
              checked={isSelected}
              aria-label={`Select ${dataset.title}`}
              onChange={() => {}}
              onClick={(event) => {
                event.stopPropagation();
                handlePromptLibrarySelect(dataset);
              }}
              className="text-primary-purple focus:ring-primary-purple h-4 w-4 cursor-pointer focus:ring-2"
            />
          );
        },
      },
      {
        accessorKey: 'title',
        header: 'Name',
        enableSorting: true,
        cell: ({ row, getValue }) => {
          const dataspaceUrl = process.env.NEXT_PUBLIC_DATASPACE_URL?.replace(/\/$/, '');
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
        accessorKey: 'domain',
        header: 'Sector',
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return value ? toTitleCase(value) : 'Sector Name';
        },
      },
      {
        accessorKey: 'testCaseCount',
        header: 'No. of Test Cases',
        cell: ({ getValue }) => getValue<number>() || 0,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        enableSorting: false,
        cell: ({ getValue }) => {
          const fullText = stripMarkdown(getValue<string>() || '').trim();
          if (!fullText) return '--';

          return (
            <Tooltip content={fullText}>
              <span className="text-gray-900 block max-w-[280px] truncate">{fullText}</span>
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
        accessorKey: 'input',
        header: 'Input',
        enableSorting: false,
        cell: ({ getValue }) => (
          <Text variant="bodySm" className="text-gray-900">
            {getValue<string>() || '--'}
          </Text>
        ),
      },
      {
        accessorKey: 'expectedOutput',
        header: 'Expected Output',
        enableSorting: false,
        cell: ({ getValue }) => (
          <Text variant="bodySm" className="text-gray-900">
            {getValue<string>() || '--'}
          </Text>
        ),
      },
      {
        id: 'actions',
        header: '',
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
    [handleDeletePromptRow, handleOpenEditPromptRow]
  );

  const runsLine: string | null = (() => {
    if (!selectedLibraryId) {
      return selectedSubModuleCount === 0
        ? "This limit adjusts based on how many sub-modules you've chosen."
        : null;
    }
    if (selectedLibraryEntryCount <= maxInputPrompts) {
      return "ParakhAI will run all input prompts from the selected library. This limit adjusts based on how many sub-modules you've chosen.";
    }
    return `ParakhAI will run the first ${maxInputPrompts} input prompts from the selected library. This limit adjusts based on how many sub-modules you've chosen.`;
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
          Maximum test cases for your current selection: {maxInputPrompts} input prompts
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
        <Text variant="bodyMd" fontWeight="medium" className="test-cases-section-label">
          Test Cases and Prompts
          <span className="required-asterisk">*</span>
        </Text>

        <div className="flex flex-wrap gap-6">
          <label className="flex min-w-[240px] flex-1 cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="testSourceMode"
              value="library"
              checked={testSourceMode === 'library'}
              onChange={() => setTestSourceMode('library')}
              className="text-primary-purple focus:ring-primary-purple mt-1 h-4 w-4 focus:ring-2"
            />
            <div className="flex-1">
              <Text variant="bodyMd" fontWeight="semibold" className="text-gray-900">
                Select a prompt library
              </Text>
              <Text variant="bodySm" className="text-gray-600 block">
                Select an existing prompt datasets curated for your evaluation scope (healthcare
                etc.)
              </Text>
            </div>
          </label>

          <label className="flex min-w-[240px] flex-1 cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="testSourceMode"
              value="custom"
              checked={testSourceMode === 'custom'}
              onChange={() => setTestSourceMode('custom')}
              className="text-primary-purple focus:ring-primary-purple mt-1 h-4 w-4 focus:ring-2"
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

      {testSourceMode === 'library' && (
        <>
          <div className="select-prompt-library-section mt-2">
            <div className="select-prompt-library-header">
              <Text variant="headingMd" className="select-prompt-library-heading block">
                Select from pre-made prompt libraries
              </Text>
              <div className="prompt-search-input select-prompt-library-search">
                <label htmlFor="promptLibrarySearch" className="sr-only">
                  Search prompt libraries
                </label>
                <div className="prompt-search-box">
                  <Icons.search size={18} className="prompt-search-icon" aria-hidden />
                  <input
                    id="promptLibrarySearch"
                    type="text"
                    value={librarySearch}
                    placeholder="Search by name"
                    onChange={(event) => setLibrarySearch(event.target.value)}
                    className="prompt-search-field"
                  />
                  {librarySearch && (
                    <button
                      type="button"
                      className="prompt-search-clear"
                      onClick={() => setLibrarySearch('')}
                      aria-label="Clear search"
                    >
                      <Icons.cross size={16} aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="test-cases-table">
              {isLoadingDatasets && promptDatasets.length === 0 ? (
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
                    {debouncedLibrarySearch
                      ? `No prompt libraries match "${debouncedLibrarySearch}".`
                      : 'No prompt libraries available for the selected domain. Please cancel this evaluation and start a new one for a different domain.'}
                  </Text>
                </div>
              ) : (
                <div style={{ position: 'relative' }} aria-busy={isLoadingDatasets}>
                  <DataTable
                    key={tableRenderKey}
                    rows={promptDatasets}
                    columns={promptDatasetColumns}
                    hideSelection
                    withServer
                    totalRows={totalPromptDatasets}
                    paginationState={datasetsPagination}
                    onPaginationChange={setDatasetsPagination}
                    hideFooter={totalPromptDatasets <= PROMPT_LIBRARY_PAGE_SIZE}
                  />
                  {/* Loader while fetching another page; the table stays mounted
                so its pagination state is kept. Inline styles because the
                Tailwind theme uses custom color/z-index tokens (no gray-*). */}
                  {isLoadingDatasets && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(31, 41, 55, 0.5)',
                      }}
                    >
                      <Spinner color="surface" />
                      <span style={{ color: '#ffffff', fontSize: '14px' }}>
                        Loading prompt datasets...
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {missingColumnsByMetric.length > 0 && (
              <div className="mt-4 space-y-1">
                {missingColumnsByMetric.map(({ metricLabel, missingColumns }) => (
                  <Text key={metricLabel} variant="bodySm" color="critical">
                    Warning: <strong>{metricLabel}</strong> requires column(s){' '}
                    <strong>{missingColumns.join(', ')}</strong> which are missing from the selected
                    library.
                  </Text>
                ))}
              </div>
            )}
          </div>

          {submoduleWarningBanner}
        </>
      )}

      {testSourceMode === 'custom' && (
        <>
          <div className="custom-prompts-section select-prompt-library-section mt-2">
            <Text variant="headingMd" className="select-prompt-library-heading block">
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
                  Maximum of {maxInputPrompts} input prompts reached. Unselect some sub-modules to
                  add more.
                </Text>
              )}
            </div>

            {missingCustomColumnsByMetric.length > 0 && (
              <div className="mt-4 space-y-1">
                {missingCustomColumnsByMetric.map(({ metricLabel, missingColumns }) => (
                  <Text key={metricLabel} variant="bodySm" color="critical">
                    Warning: <strong>{metricLabel}</strong> requires column(s){' '}
                    <strong>{missingColumns.join(', ')}</strong> which are missing from the added
                    prompts.
                  </Text>
                ))}
              </div>
            )}
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
      <div className="border-t border-gray-200 flex items-center justify-center gap-6 pt-8">
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
              {isRequestingAudit ? 'Running…' : 'Run Evaluation'}
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
