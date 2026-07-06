"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Button, Icon, Select, TextField } from "opub-ui";
import { FILTER_OPERATOR_OPTIONS } from "./promptRowsApi";
import styles from "./PromptSelectionModal.module.scss";
import type { FilterOperator, FilterRow } from "./types";

type PromptFilterBuilderProps = {
  availableColumns: string[];
  draftFilters: FilterRow[];
  onChangeDraftFilters: (next: FilterRow[]) => void;
  onApply: () => void;
  disabled?: boolean;
};

export const createFilterRow = (): FilterRow => ({
  id: `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  column: "",
  operator: "icontains",
  value: "",
});

const PromptFilterBuilder = ({
  availableColumns,
  draftFilters,
  onChangeDraftFilters,
  onApply,
  disabled,
}: PromptFilterBuilderProps) => {
  const columnOptions = availableColumns.map((c) => ({ value: c, label: c }));

  const updateFilter = (id: string, patch: Partial<FilterRow>) => {
    onChangeDraftFilters(draftFilters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeFilter = (id: string) => {
    onChangeDraftFilters(draftFilters.filter((f) => f.id !== id));
  };

  const addFilter = () => {
    onChangeDraftFilters([...draftFilters, createFilterRow()]);
  };

  return (
    <div className={styles.filterBuilder}>
      {draftFilters.map((filter) => (
        <div key={filter.id} className={styles.filterBuilderRow}>
          <Select
            name={`filter-column-${filter.id}`}
            label="Column"
            labelHidden
            placeholder="Select column"
            options={columnOptions}
            value={filter.column}
            onChange={(value) => updateFilter(filter.id, { column: value })}
            disabled={disabled}
          />
          <Select
            name={`filter-operator-${filter.id}`}
            label="Operator"
            labelHidden
            options={FILTER_OPERATOR_OPTIONS}
            value={filter.operator}
            onChange={(value) => updateFilter(filter.id, { operator: value as FilterOperator })}
            disabled={disabled}
          />
          {filter.operator === "isnull" || filter.operator === "notnull" ? (
            <Select
              name={`filter-value-${filter.id}`}
              label="Value"
              labelHidden
              options={[
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ]}
              value={filter.value || "true"}
              onChange={(value) => updateFilter(filter.id, { value })}
              disabled={disabled}
            />
          ) : (
            <TextField
              name={`filter-value-text-${filter.id}`}
              label="Value"
              labelHidden
              placeholder={
                filter.operator === "in" || filter.operator === "nin"
                  ? "Comma-separated values"
                  : "Value"
              }
              value={filter.value}
              onChange={(value) => updateFilter(filter.id, { value })}
              disabled={disabled}
            />
          )}
          <button
            type="button"
            aria-label="Remove filter"
            onClick={() => removeFilter(filter.id)}
            disabled={disabled}
            className={styles.filterBuilderRemove}
          >
            <Icon source={IconTrash} size={18} />
          </button>
        </div>
      ))}

      <div className={styles.filterBuilderActions}>
        <Button kind="tertiary" onClick={addFilter} disabled={disabled} className="!rounded-[8px]">
          <span className="inline-flex items-center gap-1">
            <Icon source={IconPlus} size={16} />
            Add filter
          </span>
        </Button>
        {draftFilters.length > 0 && (
          <Button kind="secondary" onClick={onApply} disabled={disabled} className="!rounded-[8px]">
            Apply filters
          </Button>
        )}
      </div>
    </div>
  );
};

export default PromptFilterBuilder;
