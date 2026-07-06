# Backend changes needed: per-prompt library selection

## Context

The evaluation wizard's "Select from pre-made prompt libraries" step used to let a
user pick one whole dataset; the backend then ran against everything in it. It now
lets users browse individual prompt rows (via the DataSpace REST API,
`docs/dataset_data_api.md`-style endpoints) and hand-pick specific rows from
**multiple libraries** at once. The frontend needs to send, per selected library,
which specific rows were chosen — not just the dataset id.

Frontend changes are in `app/[locale]/dashboard/ai-maker/[orgId]/evaluations/components/`
(`TestCases.tsx`, `NewEvaluationContent.tsx`, `PromptSelectionModal.tsx`,
`promptRowsApi.ts`, `types.ts`).

## Current state (works today, no backend changes required)

To avoid breaking the wizard before backend support exists, the new selection data
is currently only smuggled inside the existing free-form `configuration` JSON blob
that `UpdateAuditInput.configuration` already accepts (the same mechanism
`selectedPromptDatasetIds` already uses there). Concretely, `updateAudit` is called
with:

```jsonc
{
  "input": {
    "auditId": "...",
    "testDatasetIds": ["<datasetId>", ...],   // unchanged, whole dataset ids
    "configuration": {
      // ...existing fields unchanged...
      "selectedPromptDatasetIds": ["<datasetId>", ...],
      "promptSelections": [
        {
          "datasetId": "...",
          "resourceId": "...",
          "rowIds": ["542", "543", "pos:<resourceId>:12"],
          // Optional, frontend-only: the prompts API's available_columns at
          // selection time. Used to compute per-metric usable-prompt counts
          // on restore without re-fetching; backend can ignore it.
          "availableColumns": ["input", "expected_output", "category"]
        }
      ]
    }
  }
}
```

This round-trips fine today since `configuration` isn't schema-validated. **It does
not affect what actually runs** — `runAudit` still only receives `auditId` +
`customTestInputs`, so today the backend still evaluates the *whole* selected
dataset(s), not just the chosen rows. The UI enforces/display the row-level
selections, but nothing downstream honors them yet.

We tried adding `promptSelections` directly to `GET_AUDIT_QUERY`'s `audit { }`
selection set and as a top-level field on `UpdateAuditInput`/`RunAuditInput` — this
broke every evaluation load/save/run immediately, because GraphQL rejects an
entire query/mutation document if it references any field the schema doesn't
define. Those additions have been reverted from the query/mutation strings until
the schema actually supports them (see below).

## Schema changes needed

1. New input type:

   ```graphql
   input PromptSelectionInput {
     datasetId: ID!
     resourceId: ID!
     rowIds: [String!]!
   }
   ```

   `rowIds` is `[String!]`, not `[ID!]`/`[Int!]`, because a row id is either a raw
   value from the dataset's own id-like column (arbitrary type, sent
   stringified) or a synthetic positional key `pos:<resourceId>:<offset+index>`
   for datasets with no id-like column (see "Row id semantics" below) — treat
   both as opaque strings.

2. Add to `UpdateAuditInput`:

   ```graphql
   promptSelections: [PromptSelectionInput!]
   ```

   This is the primary path — `updateAuditConfig()` on the frontend already calls
   `updateAudit` right before `runAudit` fires, so by the time a run starts, the
   audit record already has this saved.

3. (Recommended, not required) Add the same field to `RunAuditInput`, and have the
   `runAudit` resolver treat it as authoritative for that run (falling back to
   whatever was last saved via `updateAudit` if omitted). This gives you two ways
   to receive it instead of one, at the cost of an extra schema field — your call.

4. Add a **readable** field on `Audit` mirroring `testDatasetIds`:

   ```graphql
   promptSelections: [PromptSelection!]

   type PromptSelection {
     datasetId: ID!
     resourceId: ID!
     rowIds: [String!]!
   }
   ```

   Once this exists, tell us — we'll add it back to `GET_AUDIT_QUERY` so the
   wizard restores row-level selections directly instead of digging them out of
   `configuration`.

## Behavior change needed in the audit-run path

This is the part that actually matters functionally: wherever the backend today
resolves `testDatasetIds` into the set of test inputs it feeds the model/judge, it
needs an alternate path for when `promptSelections` is present — instead of
pulling every row for a dataset's resource, pull only rows matching `rowIds`
within `resourceId`. Given the indexed-data layer already supports `id__in=<...>`
style filters (per `docs/dataset_data_api.md`), the natural implementation is:
resolve the resource's id-like column, filter `id__in=rowIds`, run against just
that result set. See "Row id semantics" for what to do about `pos:` values.

## Row id semantics — please confirm

The frontend resolves a row's id as follows (`promptRowsApi.ts:resolveIdColumn`):

- If the resource's `available_columns` includes a column literally named `id`
  (case-insensitive), that column's value (stringified) is used as the row id.
- Otherwise, it falls back to a synthetic `pos:<resourceId>:<offset>` key based on
  the row's position under a pinned `order_by` for that browsing session. This
  fallback is **not** usable for backend-side filtering — it only round-trips
  correctly if you re-run the exact same query (same filters, same order) the
  frontend used, which the backend generally can't reconstruct.

**Open question for you:** does every indexed resource in `data_db` reliably
expose a real system-assigned id column (not just domain-specific fields like the
sample dataset's `unique_id`)? If yes — under what exact name (`id`, `ID`,
`row_id`, ...)? If it's not guaranteed for every dataset, evaluations run against
a `pos:`-keyed selection either need a documented "not supported yet" behavior, or
the indexing pipeline needs to guarantee a stable id column going forward. This
determines whether the `pos:` fallback path needs backend handling at all, or can
just be treated as a known limitation for now.

## Other things worth knowing

- `docs/04-auth-and-session.md` and `docs/05-graphql-and-data-flow.md` reference
  `lib/api.ts`/`lib/api-client.ts` — those are stale/unused; the live modules are
  `lib/graphql-client.ts` and `lib/rest-client.ts`. Not related to this feature,
  just flagging since it's adjacent code.
- The new REST call the wizard makes (`GET {NEXT_PUBLIC_DATASPACE_API_URL}/api/datasets/<id>/prompts/`)
  is the first browser-side (non-`<img>`) fetch to that host from this frontend.
  Worth confirming CORS is configured to allow it from the frontend's origin.
