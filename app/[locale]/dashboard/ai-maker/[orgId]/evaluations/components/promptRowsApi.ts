import { apiFetch } from "@/lib/rest-client";
import type { FilterOperator, FilterRow, PromptRow, PromptRowsResponse } from "./types";

export type FetchPromptRowsParams = {
  datasetId: string;
  orgId: string;
  limit: number;
  offset: number;
  resourceId?: string;
  orderBy?: string;
  columns?: string[];
  filters?: FilterRow[];
  signal?: AbortSignal;
};

export async function fetchPromptRows(
  params: FetchPromptRowsParams,
): Promise<PromptRowsResponse> {
  const base = (process.env.NEXT_PUBLIC_DATASPACE_API_URL || "").replace(/\/$/, "");
  const url = new URL(`${base}/api/datasets/${params.datasetId}/prompts/`);

  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("offset", String(params.offset));
  if (params.resourceId) url.searchParams.set("resource_id", params.resourceId);
  if (params.orderBy) url.searchParams.set("order_by", params.orderBy);
  if (params.columns?.length) url.searchParams.set("columns", params.columns.join(","));

  (params.filters ?? []).forEach((f) => {
    if (!f.column || !f.operator) return;
    const key = `${f.column}__${f.operator}`;
    if (f.operator === "isnull" || f.operator === "notnull") {
      url.searchParams.append(key, f.value === "false" ? "false" : "true");
    } else if (f.operator === "in" || f.operator === "nin") {
      f.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .forEach((v) => url.searchParams.append(key, v));
    } else if (f.value.trim() !== "") {
      url.searchParams.append(key, f.value.trim());
    }
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    organization: params.orgId,
  };

  const res = await apiFetch(url.toString(), {
    method: "GET",
    headers,
    signal: params.signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body?.error || `Failed to load prompt rows (${res.status})`);
  }

  return res.json();
}

export const FILTER_OPERATOR_OPTIONS: Array<{ value: FilterOperator; label: string }> = [
  { value: "eq", label: "Equals" },
  { value: "ne", label: "Not equals" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal to" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal to" },
  { value: "in", label: "Is one of" },
  { value: "nin", label: "Is not one of" },
  { value: "contains", label: "Contains" },
  { value: "icontains", label: "Contains (any case)" },
  { value: "startswith", label: "Starts with" },
  { value: "istartswith", label: "Starts with (any case)" },
  { value: "endswith", label: "Ends with" },
  { value: "iendswith", label: "Ends with (any case)" },
  { value: "isnull", label: "Is empty" },
  { value: "notnull", label: "Is not empty" },
];

/** Case-insensitive exact match on "id" only — deliberately not unique_id/row_id/etc.,
 *  since those are domain-specific fields, not a guaranteed system row identifier. */
export function resolveIdColumn(availableColumns: string[]): string | null {
  return availableColumns.find((c) => c.trim().toLowerCase() === "id") ?? null;
}

/** Zips response.columns with each row into {rowId, values}. rowId comes from the id
 *  column when present, else a positional key `pos:<resourceId>:<offset+index>` — only
 *  valid within one pinned order_by/filter context (see PromptSelectionModal). */
export function normalizePromptRows(
  response: PromptRowsResponse,
  idColumn: string | null,
): PromptRow[] {
  const idIdx = idColumn ? response.columns.indexOf(idColumn) : -1;

  return response.rows.map((values, i) => {
    const rowId =
      idIdx >= 0 ? String(values[idIdx]) : `pos:${response.resource_id}:${response.offset + i}`;
    return {
      rowId,
      values: Object.fromEntries(response.columns.map((c, ci) => [c, values[ci]])),
    };
  });
}
