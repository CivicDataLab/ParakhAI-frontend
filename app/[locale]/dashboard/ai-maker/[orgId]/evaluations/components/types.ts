export type SelectOption = { value: string; label: string; mandatoryInputs?: string[] };

export type CustomPromptRow = {
  id: string;
  input: string;
  expectedOutput: string;
  category: string;
  riskType: string;
  selected: boolean;
};

export type AuditType = 'Technical' | 'Domain' | 'Cultural';

export type Module = {
  name: string;
  displayName: string;
  description: string;
  metrics: Array<{
    name: string;
    displayName: string;
    description: string;
    mandatoryInputs?: string[];
  }>;
};

// ---- Row-level prompt selection ----

export type PromptRowId = string;

/** Per-library record of individually selected prompt rows. */
export type PromptLibrarySelection = {
  datasetId: string;
  resourceId: string;
  rowIds: PromptRowId[];
  /** Real column names from the prompts REST API (available_columns), captured
   *  when the user picks rows in the modal. More reliable than the dataset's
   *  GraphQL schema fieldNames, which can be missing or named differently. */
  availableColumns?: string[];
  /** True only for a library restored from a pre-feature draft (had a dataset id
   *  but no row-level detail). Keeps it counted in testDatasetIds/hasPromptLibraries
   *  without fabricating a row count. Cleared the moment the user touches that
   *  library's modal. */
  isLegacyPlaceholder?: boolean;
};

/** Keyed by datasetId. An entry with rowIds.length === 0 and no isLegacyPlaceholder
 *  flag is never stored (removed instead), so Object.keys(...).length is always a
 *  correct "how many libraries are in use" count. */
export type PromptLibrarySelectionMap = Record<string, PromptLibrarySelection>;

// ---- REST: GET /api/datasets/<dataset_id>/prompts/ ----

export type PromptRowsResponse = {
  resource_id: string;
  dataset_id: string;
  available_columns: string[];
  max_limit: number;
  columns: string[];
  rows: Array<Array<string | number | boolean | null>>;
  total: number;
  limit: number;
  offset: number;
  dataset_type?: string;
  prompt_column?: string | null;
  response_column?: string | null;
  length_column?: string | null;
};

/** One denormalized row ready for the modal's DataTable. */
export type PromptRow = {
  rowId: PromptRowId;
  values: Record<string, string | number | boolean | null>;
};

// ---- Filter-row builder model ----

export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "icontains"
  | "startswith"
  | "istartswith"
  | "endswith"
  | "iendswith"
  | "isnull"
  | "notnull";

export type FilterRow = {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
};

// ---- Prompt library (DataSpace dataset) metadata ----

export type PromptDataset = {
  id: string;
  title: string;
  description?: string;
  taskType?: string;
  domain?: string;
  resourceCount: number;
  schemaFieldNames: string[];
  testCaseCount: number;
};

