import locales from '@/config/locales';

/** Default locale used across the app. */
export const DEFAULT_LOCALE = locales.default;

/** All supported locales. */
export const ALL_LOCALES = locales.all;

/** Base route paths (without locale prefix). */
export const ROUTES = {
  home: '/',
  resources: '/resources',
  dashboard: '/dashboard',
  aiMaker: '/dashboard/ai-maker',
  auditor: '/dashboard/auditor',
  promptLibraries: '/dashboard/prompt-libraries',
} as const;

/** Pagination defaults. */
export const PAGINATION = {
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
} as const;

// ============================================================================
// Evaluation status
// ============================================================================

/** Canonical evaluation status values (mirror the backend enum). */
export const EVALUATION_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_REVIEW: 'PENDING_REVIEW',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type EvaluationStatus = (typeof EVALUATION_STATUS)[keyof typeof EVALUATION_STATUS];

/** Human-readable label for a status. Prefer this over ad-hoc formatting. */
export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  QUEUED: 'Queued',
  RUNNING: 'Running',
  IN_PROGRESS: 'In Progress',
  PENDING_REVIEW: 'Pending Review',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export const getEvaluationStatusLabel = (status?: string | null): string => {
  if (!status) return 'Unknown';
  const key = status.toUpperCase() as EvaluationStatus;
  return EVALUATION_STATUS_LABELS[key] ?? status;
};

/** Statuses that indicate the evaluation hasn't reached a terminal state. */
export const ACTIVE_EVALUATION_STATUSES: readonly EvaluationStatus[] = [
  EVALUATION_STATUS.QUEUED,
  EVALUATION_STATUS.IN_PROGRESS,
  EVALUATION_STATUS.PENDING_REVIEW,
  EVALUATION_STATUS.DRAFT,
  EVALUATION_STATUS.RUNNING,
];

export const isActiveEvaluationStatus = (status?: string | null): boolean =>
  ACTIVE_EVALUATION_STATUSES.includes((status?.toUpperCase() ?? '') as EvaluationStatus);

/** Options for a filter UI (DataTable multiSelect, tabs). Ordered for display. */
export const EVALUATION_STATUS_FILTER_OPTIONS: Array<{
  label: string;
  value: EvaluationStatus;
}> = [
  EVALUATION_STATUS.DRAFT,
  EVALUATION_STATUS.QUEUED,
  EVALUATION_STATUS.IN_PROGRESS,
  EVALUATION_STATUS.PENDING_REVIEW,
  EVALUATION_STATUS.COMPLETED,
  EVALUATION_STATUS.FAILED,
  EVALUATION_STATUS.CANCELLED,
].map((value) => ({ value, label: EVALUATION_STATUS_LABELS[value] }));

// ============================================================================
// Audit type
// ============================================================================

export const AUDIT_TYPE = {
  TECHNICAL_AUDIT: 'TECHNICAL_AUDIT',
  DOMAIN_AUDIT: 'DOMAIN_AUDIT',
  CULTURAL_AUDIT: 'CULTURAL_AUDIT',
} as const;

export type AuditType = (typeof AUDIT_TYPE)[keyof typeof AUDIT_TYPE];

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  TECHNICAL_AUDIT: 'Technical',
  DOMAIN_AUDIT: 'Domain',
  CULTURAL_AUDIT: 'Cultural',
};

export const AUDIT_TYPE_OPTIONS: Array<{
  label: string;
  value: AuditType;
}> = (Object.keys(AUDIT_TYPE_LABELS) as AuditType[]).map((value) => ({
  value,
  label: AUDIT_TYPE_LABELS[value],
}));

export const getAuditTypeLabel = (type?: string | null): string => {
  if (!type) return '--';
  return AUDIT_TYPE_LABELS[type as AuditType] ?? type;
};

/**
 * Union of the display labels themselves (e.g. "Technical").
 * Some legacy UI code carries the display form in state instead of the enum;
 * use this type there rather than re-declaring `'Technical' | 'Domain' | ...`.
 */
export type AuditTypeDisplayLabel = (typeof AUDIT_TYPE_LABELS)[keyof typeof AUDIT_TYPE_LABELS];

export const AUDIT_TYPE_DISPLAY_LABELS: readonly AuditTypeDisplayLabel[] =
  Object.values(AUDIT_TYPE_LABELS);

/** Reverse-lookup: display label ("Technical") → backend enum ("TECHNICAL_AUDIT"). */
const AUDIT_TYPE_BY_DISPLAY_LABEL: Record<AuditTypeDisplayLabel, AuditType> = (
  Object.keys(AUDIT_TYPE_LABELS) as AuditType[]
).reduce(
  (acc, key) => {
    acc[AUDIT_TYPE_LABELS[key]] = key;
    return acc;
  },
  {} as Record<AuditTypeDisplayLabel, AuditType>
);

/**
 * Parse any audit-type-ish string into the canonical backend enum.
 * Handles: backend enum values (`TECHNICAL_AUDIT`), bare stems (`TECHNICAL`),
 * display labels (`Technical`), and mixed casing.
 */
export const parseAuditType = (input?: string | null): AuditType | null => {
  if (!input) return null;
  const trimmed = input.trim();
  // Exact backend enum
  if ((AUDIT_TYPE as Record<string, string>)[trimmed]) return trimmed as AuditType;
  // Exact display label
  if (AUDIT_TYPE_BY_DISPLAY_LABEL[trimmed as AuditTypeDisplayLabel]) {
    return AUDIT_TYPE_BY_DISPLAY_LABEL[trimmed as AuditTypeDisplayLabel];
  }
  // Fuzzy — case-insensitive substring match on the stem
  const upper = trimmed.toUpperCase();
  if (upper.includes('TECHNICAL')) return AUDIT_TYPE.TECHNICAL_AUDIT;
  if (upper.includes('CULTURAL')) return AUDIT_TYPE.CULTURAL_AUDIT;
  if (upper.includes('DOMAIN')) return AUDIT_TYPE.DOMAIN_AUDIT;
  return null;
};

// ============================================================================
// Evaluation mode
// ============================================================================

/**
 * Two logical modes exist. Backend has historically returned multiple aliases
 * (PLAYGROUND/MANUAL and BULK/AUTOMATED). Consumers should always normalize via
 * `normalizeEvaluationMode` or read `getEvaluationModeLabel` — never compare
 * raw strings.
 */
export const EVALUATION_MODE = {
  PLAYGROUND: 'PLAYGROUND',
  BULK: 'BULK',
} as const;

export type EvaluationMode = (typeof EVALUATION_MODE)[keyof typeof EVALUATION_MODE];

export const EVALUATION_MODE_LABELS: Record<EvaluationMode, string> = {
  PLAYGROUND: 'Playground Evaluation',
  BULK: 'Bulk Evaluation',
};

/** Legacy backend aliases → canonical mode. */
const EVALUATION_MODE_ALIASES: Record<string, EvaluationMode> = {
  PLAYGROUND: EVALUATION_MODE.PLAYGROUND,
  MANUAL: EVALUATION_MODE.PLAYGROUND,
  BULK: EVALUATION_MODE.BULK,
  AUTOMATED: EVALUATION_MODE.BULK,
};

export const normalizeEvaluationMode = (mode?: string | null): EvaluationMode | null =>
  mode ? (EVALUATION_MODE_ALIASES[mode.toUpperCase()] ?? null) : null;

export const isPlaygroundEvaluationMode = (mode?: string | null): boolean =>
  normalizeEvaluationMode(mode) === EVALUATION_MODE.PLAYGROUND;

export const isBulkEvaluationMode = (mode?: string | null): boolean =>
  normalizeEvaluationMode(mode) === EVALUATION_MODE.BULK;

export const getEvaluationModeLabel = (mode?: string | null): string => {
  const canonical = normalizeEvaluationMode(mode);
  return canonical ? EVALUATION_MODE_LABELS[canonical] : (mode ?? '--');
};

export const EVALUATION_MODE_OPTIONS: Array<{
  label: string;
  value: EvaluationMode;
}> = (Object.keys(EVALUATION_MODE_LABELS) as EvaluationMode[]).map((value) => ({
  value,
  label: EVALUATION_MODE_LABELS[value],
}));

// ============================================================================
// Audit query field mapping (client camelCase → backend snake_case)
// ============================================================================

/**
 * Backend whitelist for `audits(filters[].field)`. Any client field NOT in
 * this map is dropped by `toServerAuditFilters` before hitting the network,
 * to avoid `"Invalid field: … allowed fields: …"` errors.
 */
export const AUDIT_FILTER_FIELD_MAP: Record<string, string> = {
  status: 'status',
  auditType: 'audit_type',
  evaluationMode: 'evaluation_mode',
  modelId: 'model_id',
  modelName: 'model_name',
  name: 'name',
  passedTests: 'passed_tests',
};

// ============================================================================
// Assignment status
// ============================================================================

export const ASSIGNMENT_STATUS = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];

/** Both values the backend uses for "pending invitation". */
export const isPendingAssignmentStatus = (status?: string | null): boolean => {
  const s = status?.toUpperCase();
  return s === ASSIGNMENT_STATUS.PENDING || s === ASSIGNMENT_STATUS.QUEUED;
};

/** Assignment is actively being worked on. */
export const isActiveAssignmentStatus = (status?: string | null): boolean => {
  const s = status?.toUpperCase();
  return s === ASSIGNMENT_STATUS.ACCEPTED || s === ASSIGNMENT_STATUS.IN_PROGRESS;
};

// ============================================================================
// Test case result (per-test outcome, distinct from audit lifecycle)
// ============================================================================

export const TEST_CASE_STATUS = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
} as const;

export type TestCaseStatus = (typeof TEST_CASE_STATUS)[keyof typeof TEST_CASE_STATUS];

// ============================================================================
// Convenience: "errored" evaluation
// ============================================================================

/**
 * Backend uses both FAILED (client-facing "the run errored") and ERROR
 * (system-level exception) — treat them together in UI branches.
 */
export const isErroredEvaluationStatus = (status?: string | null): boolean => {
  const s = status?.toUpperCase();
  return s === EVALUATION_STATUS.FAILED || s === 'ERROR';
};

export const isCompletedEvaluationStatus = (status?: string | null): boolean =>
  status?.toUpperCase() === EVALUATION_STATUS.COMPLETED;

export const isPendingReviewEvaluationStatus = (status?: string | null): boolean =>
  status?.toUpperCase() === EVALUATION_STATUS.PENDING_REVIEW;
