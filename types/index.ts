/** Shared domain TypeScript types used across features. */

export type { AppUser, AppSession } from '@/hooks/use-app-session';

/** Generic paginated API response shape. */
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** Common entity reference with id and name. */
export type EntityRef = {
  id: string;
  name: string;
};

/** Organization membership info. */
export type OrgMembership = {
  organization: EntityRef;
  role: EntityRef;
};

/** AI Model lifecycle stages. */
export type LifecycleStage = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' | 'DEPRECATED' | 'ARCHIVED';

/**
 * Evaluation modes. Re-exported from `@/constants` so there's a single
 * source of truth. Canonical values are `PLAYGROUND` and `BULK`; the
 * legacy `MANUAL` / `AUTOMATED` aliases are normalized on read by
 * `normalizeEvaluationMode`.
 */
export type { EvaluationMode } from '@/constants';

/** Risk severity levels. */
export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
