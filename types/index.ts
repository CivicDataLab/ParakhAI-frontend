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
export type LifecycleStage =
  | 'DEVELOPMENT'
  | 'STAGING'
  | 'PRODUCTION'
  | 'DEPRECATED'
  | 'ARCHIVED';

/** Evaluation modes. */
export type EvaluationMode = 'MANUAL' | 'BULK' | 'AUTOMATED';

/** Risk severity levels. */
export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
