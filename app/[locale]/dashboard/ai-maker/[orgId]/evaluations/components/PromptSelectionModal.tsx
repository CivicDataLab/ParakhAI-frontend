"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button, DataTable, Dialog, Select, Spinner, Text, TextField, Tooltip } from "opub-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PromptFilterBuilder, { createFilterRow } from "./PromptFilterBuilder";
import styles from "./PromptSelectionModal.module.scss";
import { fetchPromptRows, normalizePromptRows, resolveIdColumn } from "./promptRowsApi";
import type {
  FilterRow,
  PromptDataset,
  PromptLibrarySelection,
  PromptRow,
  PromptRowsResponse,
} from "./types";

type CountMode = "first" | "last" | "random";

const COUNT_MODE_OPTIONS: Array<{ value: CountMode; label: string }> = [
  { value: "first", label: "First" },
  { value: "last", label: "Last" },
  { value: "random", label: "Random" },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type PromptSelectionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: PromptDataset;
  orgId: string;
  maxInputPrompts: number;
  globalSelectedCount: number;
  librarySelection: PromptLibrarySelection | undefined;
  onChangeLibrarySelection: (next: PromptLibrarySelection) => void;
};

const PromptSelectionModal = ({
  open,
  onOpenChange,
  dataset,
  orgId,
  maxInputPrompts,
  globalSelectedCount,
  librarySelection,
  onChangeLibrarySelection,
}: PromptSelectionModalProps) => {
  // Known upfront from props — TestCases.tsx's existing GetPromptDatasets query
  // already fetches each resource's schema field names, so there's no need to probe
  // the REST API separately just to learn whether a stable id column exists.
  const idColumn = useMemo(() => resolveIdColumn(dataset.schemaFieldNames), [dataset.schemaFieldNames]);

  // resource_id, by contrast, isn't derivable from that GraphQL schema fetch (its
  // resource ids aren't confirmed to be the same id space as the REST API's), so it's
  // captured from the first real REST response and reused for every later request in
  // this session. Ref, not state: writing it must not itself trigger a re-fetch.
  const pinnedResourceIdRef = useRef<string | null>(null);
  // Same lifetime as pinnedResourceIdRef: the REST API's real column names,
  // stamped onto the selection so metric coverage checks don't have to trust
  // the dataset's GraphQL schema fieldNames.
  const availableColumnsRef = useRef<string[] | null>(null);

  const [page, setPage] = useState(1);
  // Matches opub-ui's DataTable.defaultRowCount union — DataTable always paginates its
  // `rows` prop internally via tanstack (defaulting to 10 regardless of hideFooter), so
  // this must be passed through as defaultRowCount or rows beyond the 10th are silently
  // unreachable once the footer (which would otherwise page through them) is hidden.
  const [pageSize, setPageSize] = useState<10 | 25 | 50 | 100>(10);
  const [draftFilters, setDraftFilters] = useState<FilterRow[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<FilterRow[]>([]);
  const [response, setResponse] = useState<PromptRowsResponse | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [countMode, setCountMode] = useState<CountMode>("first");
  const [countN, setCountN] = useState(10);
  const [isApplyingCount, setIsApplyingCount] = useState(false);
  const [countMessage, setCountMessage] = useState<string | null>(null);

  // Reset when the modal (re)opens or targets a different library.
  useEffect(() => {
    if (!open) return;
    pinnedResourceIdRef.current = null;
    availableColumnsRef.current = null;
    setResponse(null);
    setPage(1);
    setAppliedFilters([]);
    setDraftFilters([]);
    setCountMessage(null);
    setPageError(null);
  }, [open, dataset.id]);

  // Single fetch path for every page/filter change, including the first — since
  // idColumn is already known from props, every request (from the very first one)
  // can pass the right order_by up front. When no id column exists we deliberately
  // don't synthesize an order_by from all columns instead — some columns are
  // JSON/array-typed and aren't orderable, which would make the request fail; we
  // rely on the backend returning a consistent order for repeated identical queries
  // within one browsing session (nothing writes concurrently to these read-only
  // datasets while a user is picking prompts).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoadingPage(true);
    setPageError(null);

    (async () => {
      try {
        const res = await fetchPromptRows({
          datasetId: dataset.id,
          orgId,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          resourceId: pinnedResourceIdRef.current ?? undefined,
          orderBy: idColumn ?? undefined,
          filters: appliedFilters,
        });
        if (cancelled) return;
        setResponse(res);
        pinnedResourceIdRef.current = res.resource_id;
        availableColumnsRef.current = res.available_columns;
      } catch (err: any) {
        if (!cancelled) setPageError(err?.message || "Failed to load prompts.");
      } finally {
        if (!cancelled) setIsLoadingPage(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, dataset.id, orgId, page, pageSize, appliedFilters, idColumn]);

  const selectedIds = useMemo(
    () => new Set(librarySelection?.rowIds ?? []),
    [librarySelection],
  );
  const currentLibraryCount = selectedIds.size;
  const otherLibrariesCount = Math.max(0, globalSelectedCount - currentLibraryCount);
  const maxSelectableForThisLibrary = Math.max(0, maxInputPrompts - otherLibrariesCount);
  const isAtGlobalCap = globalSelectedCount >= maxInputPrompts;
  const selectionSummary = `${globalSelectedCount} / ${maxInputPrompts} selected`;

  const commitSelection = useCallback(
    (rowIds: string[]) => {
      onChangeLibrarySelection({
        datasetId: dataset.id,
        resourceId: pinnedResourceIdRef.current ?? "",
        rowIds,
        availableColumns: availableColumnsRef.current ?? undefined,
      });
    },
    [dataset.id, onChangeLibrarySelection],
  );

  const toggleRow = useCallback(
    (rowId: string) => {
      const next = new Set(selectedIds);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        if (isAtGlobalCap) return;
        next.add(rowId);
      }
      commitSelection(Array.from(next));
    },
    [selectedIds, isAtGlobalCap, commitSelection],
  );

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
    setPage(1);
  }, [draftFilters]);

  const handleApplyCount = useCallback(async () => {
    if (!response) return;
    const pinnedResourceId = pinnedResourceIdRef.current;

    const total = response.total;
    const n = Math.max(0, Math.min(countN, maxSelectableForThisLibrary, total));

    if (n <= 0) {
      setCountMessage(
        maxSelectableForThisLibrary <= 0
          ? "The global limit has been reached — unselect prompts elsewhere to free up room."
          : "No rows available to select.",
      );
      return;
    }
    setCountMessage(n < countN ? `Only ${n} could be selected — global limit reached.` : null);

    setIsApplyingCount(true);
    try {
      let rowIds: string[];

      if (countMode === "first") {
        const res = await fetchPromptRows({
          datasetId: dataset.id,
          orgId,
          limit: n,
          offset: 0,
          resourceId: pinnedResourceId ?? undefined,
          orderBy: idColumn ?? undefined,
          filters: appliedFilters,
        });
        rowIds = normalizePromptRows(res, idColumn).map((r) => r.rowId);
      } else if (countMode === "last") {
        const res = await fetchPromptRows({
          datasetId: dataset.id,
          orgId,
          limit: n,
          offset: Math.max(0, total - n),
          resourceId: pinnedResourceId ?? undefined,
          orderBy: idColumn ?? undefined,
          filters: appliedFilters,
        });
        rowIds = normalizePromptRows(res, idColumn).map((r) => r.rowId);
      } else if (idColumn) {
        const idRes = await fetchPromptRows({
          datasetId: dataset.id,
          orgId,
          limit: Math.min(total, 10000),
          offset: 0,
          resourceId: pinnedResourceId ?? undefined,
          orderBy: idColumn ?? undefined,
          filters: appliedFilters,
          columns: [idColumn],
        });
        const allIds = normalizePromptRows(idRes, idColumn).map((r) => r.rowId);
        rowIds = shuffle(allIds).slice(0, n);
      } else {
        const pool = Math.min(total, 10000);
        rowIds = shuffle(Array.from({ length: pool }, (_, i) => i))
          .slice(0, n)
          .map((i) => `pos:${pinnedResourceId}:${i}`);
      }

      commitSelection(rowIds);
    } catch (err: any) {
      setCountMessage(err?.message || "Failed to select rows.");
    } finally {
      setIsApplyingCount(false);
    }
  }, [
    response,
    countN,
    maxSelectableForThisLibrary,
    countMode,
    appliedFilters,
    idColumn,
    dataset.id,
    orgId,
    commitSelection,
  ]);

  const currentPageRows: PromptRow[] = useMemo(
    () => (response ? normalizePromptRows(response, idColumn) : []),
    [response, idColumn],
  );

  const columns: ColumnDef<PromptRow>[] = useMemo(() => {
    if (!response) return [];

    const checkboxColumn: ColumnDef<PromptRow> = {
      id: "select",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const rowId = row.original.rowId;
        const checked = selectedIds.has(rowId);
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled={!checked && isAtGlobalCap}
            onChange={() => toggleRow(rowId)}
            aria-label={`Select row ${rowId}`}
            className="h-4 w-4 text-primary-purple focus:ring-primary-purple focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
        );
      },
    };

    const dataColumns: ColumnDef<PromptRow>[] = response.available_columns.map((col) => ({
      id: col,
      header: col,
      enableSorting: false,
      accessorFn: (row: PromptRow) => row.values[col],
      cell: ({ getValue }) => {
        const value = getValue<string | number | boolean | null>();
        const text = value === null || value === undefined || value === "" ? "--" : String(value);
        return (
          <Tooltip content={text}>
            <span className="block max-w-[280px] truncate text-gray-900">{text}</span>
          </Tooltip>
        );
      },
    }));

    return [checkboxColumn, ...dataColumns];
  }, [
    response,
    selectedIds,
    isAtGlobalCap,
    toggleRow,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        title={dataset.title}
        large
        limitHeight
        footer={
          <div className="flex w-full items-center justify-end gap-4">
            <Button
              kind="primary"
              onClick={() => onOpenChange(false)}
              className="!rounded-[8px] !border-none !bg-primaryPurple2 !text-white hover:!bg-[#6849EE]"
            >
              Done
            </Button>
          </div>
        }
      >
        <div
          className={`${styles.summaryBanner} ${isAtGlobalCap ? styles.summaryBannerCritical : ""}`}
        >
            <Text
              variant="bodyMd"
              fontWeight="semibold"
              color={isAtGlobalCap ? "critical" : undefined}
            >
              {selectionSummary}
            </Text>
          {isAtGlobalCap && (
            <Text variant="bodySm" className="text-gray-600">
              Global limit reached — unselect prompts elsewhere (in this or other libraries) to
              select more here.
            </Text>
          )}
        </div>

        {isLoadingPage && !response ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Spinner />
            <Text variant="bodySm" className="text-gray-600">
              Loading prompts…
            </Text>
          </div>
        ) : pageError && !response ? (
          <Text variant="bodySm" className="text-red-600">
            {pageError}
          </Text>
        ) : (
          <>
            <PromptFilterBuilder
              availableColumns={response?.available_columns ?? []}
              draftFilters={draftFilters}
              onChangeDraftFilters={setDraftFilters}
              onApply={handleApplyFilters}
              disabled={isLoadingPage}
            />

            <div className={styles.countControls}>
              <div className={styles.countControlItem}>
                <Select
                  name="prompt-count-mode"
                  label="Mode"
                  labelHidden
                  options={COUNT_MODE_OPTIONS}
                  value={countMode}
                  onChange={(value) => setCountMode(value as CountMode)}
                  disabled={isApplyingCount}
                />
              </div>
              <div className={styles.countControlItem}>
                <TextField
                  name="prompt-count-n"
                  label="Count"
                  labelHidden
                  type="number"
                  min={0}
                  value={String(countN)}
                  onChange={(value) => setCountN(Math.max(0, parseInt(value, 10) || 0))}
                  disabled={isApplyingCount}
                />
              </div>
              <Button
                kind="secondary"
                size="slim"
                onClick={handleApplyCount}
                disabled={isApplyingCount || !response || countN <= 0}
                className="!rounded-[8px] shrink-0 whitespace-nowrap"
              >
                <span>{isApplyingCount ? "Selecting…" : `Select ${countMode}`}</span>
              </Button>
            </div>
            {countMessage && (
              <Text variant="bodySm" color="critical" className="block mb-3">
                {countMessage}
              </Text>
            )}

            {pageError && (
              <Text variant="bodySm" className="text-red-600 block mb-3">
                {pageError}
              </Text>
            )}
            <div className={styles.tableWrapper}>
              <DataTable
                rows={currentPageRows}
                columns={columns}
                hideSelection
                defaultRowCount={pageSize}
                placeholder="No prompts match these filters."
                isCustomization
                pageIdx={(page - 1) * pageSize}
                pageSize={pageSize}
                totalPages={response?.total ?? 0}
                paginationControls={{
                  goToFirstPage: () => setPage(1),
                  goToPreviousPage: () => setPage((p) => Math.max(1, p - 1)),
                  goToNextPage: () => setPage((p) => p + 1),
                  goToLastPage: () =>
                    setPage(Math.max(1, Math.ceil((response?.total ?? 0) / pageSize))),
                }}
                handlePageSizeChange={(size: number) => {
                  // Safe: DataTable's own footer only ever offers 10/25/50/100.
                  setPageSize(size as 10 | 25 | 50 | 100);
                  setPage(1);
                }}
              />
            </div>
            {/* <div className="flex justify-end mt-2"> */}
              {/* <Text variant="bodySm" color={isAtGlobalCap ? "critical" : "subdued"}>
                {selectionSummary}
              </Text> */}
            {/* </div> */}
          </>
        )}
      </Dialog.Content>
    </Dialog>
  );
};

export default PromptSelectionModal;
