"use client";

import type { AuditResult } from "@/lib/bulkEvaluation/mapAuditResults";
import { mapAuditResultsToBulkTestCases } from "@/lib/bulkEvaluation/mapAuditResults";

import type {
  BulkTestCase,
  BulkTestCaseRisk,
  ModuleIssueCount,
} from "@/lib/bulkEvaluation/types";
import { IconArrowsDiagonal, IconSparkles } from "@tabler/icons-react";
import { Select, Spinner, Tag, Text } from "opub-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BulkTestCaseDetailSheet from "./BulkTestCaseDetailSheet";

const PAGE_SIZE = 15;

const SORT_OPTIONS = [
  { value: "issues_desc", label: "No. of Issues - High to Low" },
  { value: "issues_asc", label: "No. of Issues - Low to High" },
];

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

const getRiskTagColors = (
  severity: "LOW" | "MEDIUM" | "HIGH"
): { fillColor: string; textColor: string } => {
  switch (severity) {
    case "HIGH":
      return { fillColor: "#FCE7F3", textColor: "#E11D48" };
    case "MEDIUM":
      return { fillColor: "#FFFBEB", textColor: "#92400E" };
    case "LOW":
      return { fillColor: "#EFF6FF", textColor: "#2563EB" };
    default:
      return { fillColor: "#F3F4F6", textColor: "#374151" };
  }
};

const formatRiskLabel = (severity: "LOW" | "MEDIUM" | "HIGH", label: string) =>
  `${severity.charAt(0) + severity.slice(1).toLowerCase()} risk - ${label}`;

const formatModuleDisplayName = (moduleId: string): string => {
  const moduleMap: Record<string, string> = {
    BIAS_FAIRNESS: "Bias and Fairness",
    HALLUCINATION_MISINFORMATION: "Hallucination and Misinformation",
    PRIVACY_SAFETY: "Privacy and Safety",
  };
  return (
    moduleMap[moduleId] ||
    moduleId
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  );
};

type AuditResultsListProps = {
  auditId: string;
  orgId?: string;
  isEditable?: boolean;
  bannerVariant?: "pending" | "reviewed";
  metricSummary?: Record<string, Record<string, unknown>>;
  selectedMetricCount?: number;
  results: AuditResult[] | null;
};

const AuditResultsList = ({
  auditId,
  orgId,
  isEditable = false,
  bannerVariant = "pending",
  metricSummary: metricSummaryProp = {},
  selectedMetricCount = 0,
  results,
}: AuditResultsListProps) => {
  const [items, setItems] = useState<BulkTestCase[]>([]);
  const moduleIssueCounts = useMemo<ModuleIssueCount[]>(() => {
    const map = new Map<string, { displayName: string; issueCount: number }>();

    for (const item of items) {
      const existing = map.get(item.moduleId) ?? {
        displayName: item.moduleDisplayName,
        issueCount: 0,
      };
      existing.issueCount += item.risks.length;
      map.set(item.moduleId, existing);
    }

    return Array.from(map.entries())
      .map(([moduleId, value]) => ({
        moduleId,
        displayName: value.displayName,
        issueCount: value.issueCount,
      }))
      .filter((entry) => entry.issueCount > 0);
  }, [items]);
  const [sortBy, setSortBy] = useState<SortOption>("issues_desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedTestCase, setSelectedTestCase] = useState<BulkTestCase | null>(
    null
  );
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const cardMeasureRef = useRef<HTMLDivElement | null>(null);
  const [listMaxHeight, setListMaxHeight] = useState<number | undefined>();

  useEffect(() => {
    if (results === null) return;

    const metricToModule: Record<string, string> = {};
    for (const [moduleId, metrics] of Object.entries(metricSummaryProp)) {
      for (const metricName of Object.keys(metrics)) {
        metricToModule[metricName] = moduleId;
      }
    }

    const { items: mappedItems } = mapAuditResultsToBulkTestCases(results);

    const singleFallbackModule =
      Object.keys(metricToModule).length > 0
        ? Object.values(metricToModule)[0]
        : null;

    const resolvedItems = mappedItems.map((item) => {
      if (item.moduleId !== "UNKNOWN") return item;
      const metricKey = item.allMetricResults[0]?.metricKey;
      const moduleId =
        (metricKey ? metricToModule[metricKey] : null) ?? singleFallbackModule;
      if (!moduleId) return item;
      return {
        ...item,
        moduleId,
        moduleDisplayName: formatModuleDisplayName(moduleId),
      };
    });

    setItems(resolvedItems);
    setVisibleCount(PAGE_SIZE);
  }, [results, metricSummaryProp]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const diff = b.risks.length - a.risks.length;
      return sortBy === "issues_desc" ? diff : -diff;
    });
  }, [items, sortBy]);

  const displayedItems = useMemo(
    () => sortedItems.slice(0, visibleCount),
    [sortedItems, visibleCount]
  );

  const hasMore = visibleCount < sortedItems.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sortBy]);

  useEffect(() => {
    const node = loadMoreRef.current;
    const root = scrollContainerRef.current;
    if (!node || !hasMore || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { root, rootMargin: "80px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, displayedItems.length]);

  useEffect(() => {
    const card = cardMeasureRef.current;
    if (!card) return;

    const updateHeight = () => {
      const cardHeight = card.getBoundingClientRect().height;
      const gap = 16;
      setListMaxHeight(cardHeight * 2 + gap);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(card);
    return () => observer.disconnect();
  }, [displayedItems.length, sortBy]);

  const openTestCaseDetail = (testCase: BulkTestCase) => {
    setSelectedTestCase(testCase);
    setIsDetailSheetOpen(true);
  };

  const handleTestCaseUpdate = useCallback(
    (testCaseId: string, updatedRisks: BulkTestCaseRisk[]) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === testCaseId ? { ...item, risks: updatedRisks } : item
        )
      );
    },
    []
  );

  return (
    <div className="bulk-evaluation-results mb-8">
      <div className="bulk-evaluation-results-header mb-4">
        <Text variant="headingMd" fontWeight="bold">
          Evaluation Results
        </Text>
      </div>

      <div className="bulk-evaluation-results-panel">
        <div className="bulk-evaluation-results-content w-full pb-4 pt-0">
          {items.length > 0 && (
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {moduleIssueCounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {moduleIssueCounts.map((module) => (
                  <span
                    key={module.moduleId}
                    className="bulk-evaluation-module-pill"
                  >
                    {module.displayName} - {module.issueCount} Issues
                  </span>
                ))}
              </div>
              )}

              <div className="bulk-evaluation-results-sort flex shrink-0 items-center gap-2 lg:ml-auto">
                <Text variant="bodySm" fontWeight="medium">
                  Sort
                </Text>
                <div className="bulk-evaluation-results-sort__select">
                  <Select
                    name="audit-results-sort"
                    label="Sort"
                    labelHidden
                    options={SORT_OPTIONS}
                    value={sortBy}
                    onChange={(value) => setSortBy(value as SortOption)}
                  />
                </div>
              </div>
            </div>
          )}

          {results === null && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}

          <div
            ref={scrollContainerRef}
            className="bulk-evaluation-results-list flex w-full flex-col gap-4 overflow-y-auto"
            style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
          >
            {displayedItems.map((testCase, index) => (
              <div
                key={testCase.id}
                ref={index === 0 ? cardMeasureRef : undefined}
                role="button"
                tabIndex={0}
                onClick={() => openTestCaseDetail(testCase)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openTestCaseDetail(testCase);
                  }
                }}
                className="test-case-card-border box-border w-full shrink-0 bg-white p-6 cursor-pointer text-left transition-colors hover:bg-gray-50"
                aria-label={`View details for input ${testCase.index}`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <Text
                    variant="bodyMd"
                    fontWeight="medium"
                    className="text-gray-600"
                  >
                    Input {testCase.index}
                  </Text>
                  <IconArrowsDiagonal
                    size={18}
                    className="shrink-0 text-gray-500"
                    aria-hidden
                  />
                </div>

                <Text
                  variant="bodyMd"
                  fontWeight="bold"
                  className="text-gray-900 mb-3 block"
                >
                  {testCase.inputPrompt}
                </Text>

                <div className="bulk-evaluation-card-prose prose prose-sm max-w-none text-gray-700 mb-4 line-clamp-3">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {testCase.output}
                  </ReactMarkdown>
                </div>

                <div className="flex flex-wrap gap-2">
                  {testCase.risks.map((risk, riskIndex) => {
                    const colors = getRiskTagColors(risk.severity);
                    return (
                      <Tag
                        key={`${testCase.id}-risk-${riskIndex}`}
                        variation="filled"
                        fillColor={colors.fillColor}
                        textColor={colors.textColor}
                      >
                        {formatRiskLabel(risk.severity, risk.label)}
                      </Tag>
                    );
                  })}
                </div>
              </div>
            ))}

            {results !== null && displayedItems.length === 0 && (
              <Text variant="bodySm" className="text-gray-600 py-6 block">
                No inputs found for the selected module.
              </Text>
            )}

            <div ref={loadMoreRef} className="h-4 shrink-0" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div
        className={`${
          bannerVariant === "reviewed"
            ? "bulk-evaluation-reviewed-banner"
            : "bulk-evaluation-pending-banner"
        } mt-4`}
      >
        <IconSparkles
          size={18}
          className={`${
            bannerVariant === "reviewed"
              ? "bulk-evaluation-reviewed-banner__icon"
              : "bulk-evaluation-pending-banner__icon"
          } shrink-0`}
          aria-hidden
        />
        <Text variant="bodySm" className="text-gray-900">
          {bannerVariant === "reviewed"
            ? "This evaluation has AI generated observations that were reviewed by the evaluator."
            : "This evaluation has AI generated observations pending review by the evaluator."}
        </Text>
      </div>

      <BulkTestCaseDetailSheet
        testCase={selectedTestCase}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        isEditable={isEditable}
        orgId={orgId}
        selectedMetricCount={selectedMetricCount}
        onIssuesChange={handleTestCaseUpdate}
      />
    </div>
  );
};

export default AuditResultsList;
