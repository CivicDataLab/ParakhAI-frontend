'use client';

import { Button } from 'opub-ui';
import { EVALUATION_STATUS_FILTER_OPTIONS as EVALUATION_STATUS_FILTER_OPTIONS_BASE } from '@/constants';

export type StatusFilterOption = {
  label: string;
  value: string;
};

/** Tab-style filter options for evaluation status — includes an "All" entry
 *  that isn't part of the canonical enum. Derived from the SoT in `@/constants`. */
export const EVALUATION_STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { label: 'All', value: 'ALL' },
  ...EVALUATION_STATUS_FILTER_OPTIONS_BASE,
];

type StatusFilterTabsProps = {
  options: StatusFilterOption[];
  value: string;
  onChange: (value: string) => void;
  /** Items used to compute per-status counts (shown for non-ALL tabs). */
  items?: Array<{ status?: string | null }>;
  className?: string;
};

export function StatusFilterTabs({
  options,
  value,
  onChange,
  items,
  className = 'mb-6 flex items-center gap-4',
}: StatusFilterTabsProps) {
  const getCount = (optionValue: string) => {
    if (!items || optionValue === 'ALL') return null;
    return items.filter((item) => item.status?.toUpperCase() === optionValue).length;
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 pl-1">
        {options.map((option) => {
          const count = getCount(option.value);
          const isActive = value === option.value;

          return (
            <Button
              key={option.value}
              kind="secondary"
              size="slim"
              onClick={() => onChange(option.value)}
              className={`text-sm px-3 py-1.5 transition-colors ${
                isActive
                  ? 'bg-primaryPurple2 text-white'
                  : 'bg-gray-100 text-gray-700 hover:primaryPurple2'
              }`}
            >
              {option.label}
              {count !== null && <span className="text-xs ml-1.5">({count})</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
