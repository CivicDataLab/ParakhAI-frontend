'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TableFiltersState, TablePaginationState, TableSortingState } from 'opub-ui';
import { useGraphQL } from '@/lib/graphql-client';
import { AUDIT_FILTER_FIELD_MAP, isActiveEvaluationStatus } from '@/constants';

const AUDITS_QUERY = `
  query GetAudits(
    $limit: Int
    $offset: Int
    $filters: [FilterSpec!]
    $sortOptions: [SortSpec!]
  ) {
    audits(limit: $limit, offset: $offset, filters: $filters, sortOptions: $sortOptions) {
      data {
        id
        name
        modelId
        modelName
        status
        modules
        metrics
        evaluationMode
        auditType
        totalTests
        passedTests
        failedTests
        createdAt
        startedAt
        completedAt
      }
      totalItemsCount
    }
  }
`;

export type Audit = {
  id: string;
  name: string;
  modelId: string;
  modelName: string | null;
  status: string;
  modules: string[];
  metrics: string[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  evaluationMode: string;
  auditType: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_POLL_INTERVAL_MS = 15_000;
const DEFAULT_SORTING: TableSortingState = [{ field: 'completedAt', direction: 'desc' }];

const toSnakeCase = (s: string) => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

/** Translate DataTable filter fields to backend snake_case, dropping any
 *  field not whitelisted in AUDIT_FILTER_FIELD_MAP. */
const toServerFilters = (filters: TableFiltersState) =>
  filters
    .map((f) => {
      const serverField = AUDIT_FILTER_FIELD_MAP[f.field];
      return serverField ? { ...f, field: serverField } : null;
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

/** DataTable emits an array of sort specs (multi-column). The backend accepts
 *  a single `{field, direction}`, so we take the first entry. */
const toServerSort = (sorting: TableSortingState) => {
  const first = sorting[0];
  return first ? { field: toSnakeCase(first.field), direction: first.direction } : null;
};

type Options = {
  /** Organization ID used as the GraphQL `organization` context header. */
  orgId: string;
  /** Wait until this is true before firing any request (e.g. session ready). */
  isReady: boolean;
  pageSize?: number;
  pollIntervalMs?: number;
  initialSorting?: TableSortingState;
};

/**
 * Server-driven state for the audits list: data + loading/error, plus
 * DataTable-compatible `filters`/`sorting`/`pagination` state and their
 * setters. Automatically refetches on state changes and polls while any
 * visible audit is still in a non-terminal status.
 */
export const useAuditsQuery = ({
  orgId,
  isReady,
  pageSize = DEFAULT_PAGE_SIZE,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  initialSorting = DEFAULT_SORTING,
}: Options) => {
  const { request } = useGraphQL();
  const requestRef = useRef(request);
  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  const [audits, setAudits] = useState<Audit[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<TableFiltersState>([]);
  const [sorting, setSorting] = useState<TableSortingState>(initialSorting);
  const [pagination, setPagination] = useState<TablePaginationState>({
    limit: pageSize,
    offset: 0,
  });

  // Keep the latest query args in a ref so the polling interval can read them
  // without being recreated every time they change.
  const argsRef = useRef({ filters, sorting, pagination });
  useEffect(() => {
    argsRef.current = { filters, sorting, pagination };
  }, [filters, sorting, pagination]);

  const fetchAudits = useCallback(
    async ({ showLoader = false }: { showLoader?: boolean } = {}) => {
      const { filters: f, sorting: s, pagination: p } = argsRef.current;
      try {
        if (showLoader) setIsLoading(true);
        setError(null);
        const serverFilters = toServerFilters(f);
        const data = await requestRef.current<{
          audits: { data: Audit[]; totalItemsCount: number };
        }>(
          AUDITS_QUERY,
          {
            limit: p.limit,
            offset: p.offset,
            filters: serverFilters.length ? serverFilters : null,
            sortOptions: toServerSort(s),
          },
          { organization: orgId }
        );
        setAudits(data?.audits?.data ?? []);
        setTotalRows(data?.audits?.totalItemsCount ?? 0);
      } catch (err) {
        console.error('Error fetching audits:', err);
        setError(err instanceof Error ? err.message : 'Failed to load audits');
      } finally {
        if (showLoader) setIsLoading(false);
        setHasEverLoaded(true);
      }
    },
    [orgId]
  );

  // Refetch whenever the auth becomes ready or query args change.
  useEffect(() => {
    if (!isReady) return;
    void fetchAudits({ showLoader: !hasEverLoaded });
    // `hasEverLoaded` intentionally omitted so we don't re-fire on the flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, filters, sorting, pagination, fetchAudits]);

  // Poll while the visible page still contains any non-terminal audits.
  const shouldPoll = audits.some((a) => isActiveEvaluationStatus(a.status));
  useEffect(() => {
    if (!isReady || !shouldPoll) return;
    const id = window.setInterval(() => {
      void fetchAudits({ showLoader: false });
    }, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [isReady, shouldPoll, pollIntervalMs, fetchAudits]);

  return {
    audits,
    totalRows,
    isLoading,
    hasEverLoaded,
    error,
    filters,
    sorting,
    pagination,
    setFilters,
    setSorting,
    setPagination,
    refetch: fetchAudits,
  };
};
