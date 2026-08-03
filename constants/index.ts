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

/** Evaluation status values used across the codebase. */
export const EVALUATION_STATUS = {
  draft: 'DRAFT',
  pending: 'PENDING',
  queued: 'QUEUED',
  running: 'RUNNING',
  completed: 'COMPLETED',
  failed: 'FAILED',
  inProgress: 'IN_PROGRESS',
  cancelled: 'CANCELLED',
  pendingReview: 'PENDING_REVIEW',
} as const;

/** Assignment status values. */
export const ASSIGNMENT_STATUS = {
  pending: 'PENDING',
  queued: 'QUEUED',
  accepted: 'ACCEPTED',
  declined: 'DECLINED',
  inProgress: 'IN_PROGRESS',
  completed: 'COMPLETED',
} as const;
