"use client";

import { IconArrowsDiagonal } from "@tabler/icons-react";
import { Tag, Text } from "opub-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ManualTestCaseDetailSheet, {
  type ManualTestCaseDetail,
} from "./ManualTestCaseDetailSheet";
import type { ManualTestCase, SubModuleInfo } from "./types";
import {
  formatRiskLabel,
  getFailedManualTestCaseIssues,
  getIssueRiskTagColors,
  isManualTestCasePassed,
  resolveIssueDisplayName,
} from "./utils";

type CompletedTestCasesProps = {
  testCases: ManualTestCase[];
  modules: string[];
  subModules?: SubModuleInfo[];
  getModuleDisplayName: (name: string) => string;
};

const CompletedTestCases = ({
  testCases,
  subModules = [],
}: CompletedTestCasesProps) => {
  const [selectedTestCase, setSelectedTestCase] =
    useState<ManualTestCaseDetail | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const cardMeasureRef = useRef<HTMLDivElement | null>(null);
  const [listMaxHeight, setListMaxHeight] = useState<number | undefined>();

  const displayedItems = useMemo(() => {
    return [...testCases].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        const byTime =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (byTime !== 0) return byTime;
      }
      return a.id.localeCompare(b.id);
    });
  }, [testCases]);

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
  }, [displayedItems.length]);

  const openTestCaseDetail = (testCase: ManualTestCase, index: number) => {
    setSelectedTestCase({
      ...testCase,
      displayIndex: index + 1,
    });
    setIsDetailSheetOpen(true);
  };

  if (testCases.length === 0) {
    return null;
  }

  return (
    <div className="bulk-evaluation-results mb-8 mt-12">
      <div className="bulk-evaluation-results-header mb-4">
        <Text variant="headingMd" fontWeight="bold">
          Completed Test Cases
        </Text>
      </div>

      <div className="bulk-evaluation-results-panel">
        <div className="bulk-evaluation-results-content w-full pb-4 pt-0">
          <div
            ref={scrollContainerRef}
            className="bulk-evaluation-results-list flex w-full flex-col gap-4 overflow-y-auto"
            style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
          >
            {displayedItems.length === 0 ? (
              <Text variant="bodySm" className="text-gray-600 py-6 block">
                No completed test cases yet.
              </Text>
            ) : (
              displayedItems.map((testCase, index) => {
                const failedIssues = testCase.issues.filter(
                  (issue) => issue.status === "FAILED"
                );
                const isPassed = failedIssues.length === 0;

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
                        failedIssues.map((issue, i) => {
                          const issueLabel = resolveIssueDisplayName(
                            issue.metricName,
                            subModules
                          );
                          const riskLabel = formatRiskLabel(issue.severity, issueLabel);
                          if (!riskLabel) return null;
                          return (
                            <Tag
                              key={i}
                              variation="filled"
                              fillColor={getIssueRiskTagColors(issue.severity).fillColor}
                              textColor={getIssueRiskTagColors(issue.severity).textColor}
                            >
                              {riskLabel}
                            </Tag>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ManualTestCaseDetailSheet
        testCase={selectedTestCase}
        subModules={subModules}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
      />
    </div>
  );
};

export default CompletedTestCases;
