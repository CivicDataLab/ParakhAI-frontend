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
import { resolveIssueDisplayName } from "./utils";

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

type CompletedTestCasesProps = {
  testCases: ManualTestCase[];
  modules: string[];
  subModules?: SubModuleInfo[];
  getModuleDisplayName: (name: string) => string;
};

const CompletedTestCases = ({
  testCases,
  modules,
  subModules = [],
  getModuleDisplayName,
}: CompletedTestCasesProps) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedTestCase, setSelectedTestCase] =
    useState<ManualTestCaseDetail | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const cardMeasureRef = useRef<HTMLDivElement | null>(null);
  const [listMaxHeight, setListMaxHeight] = useState<number | undefined>();

  const moduleIssueCounts = useMemo(
    () =>
      modules.map((moduleId) => ({
        moduleId,
        displayName: getModuleDisplayName(moduleId),
        issueCount: testCases.filter(
          (testCase) =>
            testCase.module === moduleId && testCase.status === "FAILED"
        ).length,
      })),
    [getModuleDisplayName, modules, testCases]
  );

  useEffect(() => {
    if (moduleIssueCounts.length > 0 && !selectedModuleId) {
      setSelectedModuleId(moduleIssueCounts[0].moduleId);
    }
  }, [moduleIssueCounts, selectedModuleId]);

  const displayedItems = useMemo(() => {
    const filtered = selectedModuleId
      ? testCases.filter((testCase) => testCase.module === selectedModuleId)
      : testCases;

    return [...filtered].sort((a, b) => {
      const byTime =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (byTime !== 0) return byTime;
      return a.id.localeCompare(b.id);
    });
  }, [selectedModuleId, testCases]);

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
  }, [displayedItems.length, selectedModuleId]);

  const openTestCaseDetail = (testCase: ManualTestCase, index: number) => {
    const issueKey = testCase.issueType || testCase.subModule;
    const issueLabel = resolveIssueDisplayName(
      issueKey,
      subModules,
      testCase.module
    );

    setSelectedTestCase({
      ...testCase,
      displayIndex: index + 1,
      issueLabel: issueLabel || undefined,
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
          {moduleIssueCounts.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {moduleIssueCounts.map((module) => {
                const isSelected = module.moduleId === selectedModuleId;

                return (
                  <button
                    key={module.moduleId}
                    type="button"
                    className={`bulk-evaluation-module-pill${
                      isSelected ? " bulk-evaluation-module-pill--selected" : ""
                    }`}
                    onClick={() => setSelectedModuleId(module.moduleId)}
                    aria-pressed={isSelected}
                  >
                    {module.displayName} - {module.issueCount} Issues
                  </button>
                );
              })}
            </div>
          )}

          <div
            ref={scrollContainerRef}
            className="bulk-evaluation-results-list flex w-full flex-col gap-4 overflow-y-auto"
            style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
          >
            {displayedItems.length === 0 ? (
              <Text variant="bodySm" className="text-gray-600 py-6 block">
                No completed test cases for the selected module.
              </Text>
            ) : (
              displayedItems.map((testCase, index) => {
                const issueKey = testCase.issueType || testCase.subModule;
                const issueLabel = resolveIssueDisplayName(
                  issueKey,
                  subModules,
                  testCase.module
                );

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
                      {testCase.inputPrompt}
                    </Text>

                    <div className="bulk-evaluation-card-prose prose prose-sm max-w-none text-gray-700 mb-4 line-clamp-3">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {testCase.modelOutput}
                      </ReactMarkdown>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {testCase.status === "PASSED" ? (
                        <Tag
                          variation="filled"
                          fillColor="#DCFCE7"
                          textColor="#15803D"
                        >
                          Passed
                        </Tag>
                      ) : testCase.severity && issueLabel ? (
                        <Tag
                          variation="filled"
                          fillColor={
                            getRiskTagColors(testCase.severity).fillColor
                          }
                          textColor={
                            getRiskTagColors(testCase.severity).textColor
                          }
                        >
                          {formatRiskLabel(testCase.severity, issueLabel)}
                        </Tag>
                      ) : null}
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
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
      />
    </div>
  );
};

export default CompletedTestCases;
