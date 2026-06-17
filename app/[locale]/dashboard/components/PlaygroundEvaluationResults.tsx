"use client";

import { useGraphQL } from "@/lib/api";
import { GET_TEST_CASES_QUERY } from "@/app/[locale]/dashboard/ai-maker/[orgId]/evaluations/components/manual-evaluation/queries";
import ManualTestCaseDetailSheet, {
  type ManualTestCaseDetail,
} from "@/app/[locale]/dashboard/ai-maker/[orgId]/evaluations/components/manual-evaluation/ManualTestCaseDetailSheet";
import type { ManualTestCase } from "@/app/[locale]/dashboard/ai-maker/[orgId]/evaluations/components/manual-evaluation/types";
import { resolveIssueDisplayName } from "@/app/[locale]/dashboard/ai-maker/[orgId]/evaluations/components/manual-evaluation/utils";
import { IconArrowsDiagonal, IconSparkles } from "@tabler/icons-react";
import { Select, Spinner, Tag, Text } from "opub-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
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

type PlaygroundEvaluationResultsProps = {
  auditId: string;
  orgId?: string;
  modules?: string[];
};

const PlaygroundEvaluationResults = ({
  auditId,
  orgId,
}: PlaygroundEvaluationResultsProps) => {
  const { request, isAuthenticated, isLoading: isSessionLoading } =
    useGraphQL();
  const [testCases, setTestCases] = useState<ManualTestCase[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTestCase, setSelectedTestCase] =
    useState<ManualTestCaseDetail | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const cardMeasureRef = useRef<HTMLDivElement | null>(null);
  const [listMaxHeight, setListMaxHeight] = useState<number | undefined>();

  const fetchTestCases = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await request<{ manualTestCases: ManualTestCase[] }>(
        GET_TEST_CASES_QUERY,
        { auditId },
        orgId ? { organization: orgId } : undefined
      );

      setTestCases(result?.manualTestCases ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load evaluation inputs"
      );
    } finally {
      setIsLoading(false);
    }
  }, [auditId, isAuthenticated, orgId, request]);

  useEffect(() => {
    if (isSessionLoading) return;
    void fetchTestCases();
  }, [fetchTestCases, isSessionLoading]);

  const displayedItems = useMemo(() => {
    return [...testCases].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const diff = aTime - bTime;
      if (diff !== 0) {
        return sortBy === "oldest" ? diff : -diff;
      }
      return sortBy === "oldest"
        ? a.id.localeCompare(b.id)
        : b.id.localeCompare(a.id);
    });
  }, [sortBy, testCases]);

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

  const openTestCaseDetail = (testCase: ManualTestCase, index: number) => {
    setSelectedTestCase({
      ...testCase,
      displayIndex: index + 1,
    });
    setIsDetailSheetOpen(true);
  };

  return (
    <div className="bulk-evaluation-results mb-8">
      <div className="bulk-evaluation-results-header mb-4">
        <Text variant="headingMd" fontWeight="bold">
          Evaluation Results
        </Text>
      </div>

      <div className="bulk-evaluation-results-panel">
        <div className="bulk-evaluation-results-content w-full pb-4 pt-0">
          <div className="mb-6 flex justify-end">
            <div className="bulk-evaluation-results-sort flex shrink-0 items-center gap-2">
              <Text variant="bodySm" fontWeight="medium">
                Sort
              </Text>
              <div className="bulk-evaluation-results-sort__select">
                <Select
                  name="playground-evaluation-sort"
                  label="Sort"
                  labelHidden
                  options={SORT_OPTIONS}
                  value={sortBy}
                  onChange={(value) => setSortBy(value as SortOption)}
                />
              </div>
            </div>
          </div>

          {error && (
            <Text variant="bodySm" className="text-red-600 mb-4 block">
              {error}
            </Text>
          )}

          <div
            ref={scrollContainerRef}
            className="bulk-evaluation-results-list flex w-full flex-col gap-4 overflow-y-auto"
            style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
          >
            {displayedItems.map((testCase, index) => {
              const isPassed = testCase.issues.length === 0;

              return (
                <div
                  key={testCase.id}
                  ref={index === 0 ? cardMeasureRef : undefined}
                  role="button"
                  tabIndex={0}
                  onClick={() => openTestCaseDetail(testCase, index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openTestCaseDetail(testCase, index);
                    }
                  }}
                  className="test-case-card-border box-border w-full shrink-0 bg-white p-6 cursor-pointer text-left transition-colors hover:bg-gray-50"
                  aria-label={`View details for input ${index + 1}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <Text
                      variant="bodyMd"
                      fontWeight="medium"
                      className="text-gray-600"
                    >
                      Input {index + 1}
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
                    {testCase.testInput}
                  </Text>

                  <div className="bulk-evaluation-card-prose prose prose-sm max-w-none text-gray-700 mb-4 line-clamp-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {testCase.actualOutput}
                    </ReactMarkdown>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isPassed ? (
                      <Tag
                        variation="filled"
                        fillColor="#DCFCE7"
                        textColor="#15803D"
                      >
                        Passed
                      </Tag>
                    ) : (
                      testCase.issues.map((issue, issueIndex) => {
                        const issueLabel = resolveIssueDisplayName(
                          issue.metricName,
                          []
                        );
                        return (
                          <Tag
                            key={issueIndex}
                            variation="filled"
                            fillColor={
                              getRiskTagColors(issue.severity).fillColor
                            }
                            textColor={
                              getRiskTagColors(issue.severity).textColor
                            }
                          >
                            {formatRiskLabel(issue.severity, issueLabel)}
                          </Tag>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}

            {!isLoading && displayedItems.length === 0 && !error && (
              <Text variant="bodySm" className="text-gray-600 py-6 block">
                No evaluation inputs found.
              </Text>
            )}

            {isLoading && (
              <div className="flex shrink-0 justify-center py-4">
                <Spinner />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bulk-evaluation-reviewed-banner mt-4">
        <IconSparkles
          size={18}
          className="bulk-evaluation-reviewed-banner__icon shrink-0"
          aria-hidden
        />
        <Text variant="bodySm" className="text-gray-900">
          This evaluation has AI generated observations that were reviewed by
          the evaluator.
        </Text>
      </div>

      <ManualTestCaseDetailSheet
        testCase={selectedTestCase}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
      />
    </div>
  );
};

export default PlaygroundEvaluationResults;
