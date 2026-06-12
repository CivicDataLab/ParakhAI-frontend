"use client";

import { Icons } from "@/components/icons";
import { Button, Divider, Icon, Sheet, Tag, Text } from "opub-ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ManualTestCase } from "./types";

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

export type ManualTestCaseDetail = ManualTestCase & {
  displayIndex: number;
  issueLabel?: string;
};

type ManualTestCaseDetailSheetProps = {
  testCase: ManualTestCaseDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ManualTestCaseDetailSheet = ({
  testCase,
  open,
  onOpenChange,
}: ManualTestCaseDetailSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Sheet.Content
        side="right"
        size="wide"
        className="flex h-full flex-col overflow-hidden p-0"
      >
        {testCase && (
          <>
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <Text variant="headingLg" fontWeight="bold" className="block">
                Input {testCase.displayIndex}
              </Text>
              <Button
                kind="tertiary"
                onClick={() => onOpenChange(false)}
                aria-label="Close detail panel"
              >
                <Icon source={Icons.cross} size={20} color="default" />
              </Button>
            </div>

            <div className="bulk-test-case-detail-sheet-info-banner shrink-0 px-6 py-3">
              <Icon
                source={Icons.info}
                size={18}
                className="bulk-test-case-detail-sheet-info-banner__icon shrink-0"
                color="subdued"
              />
              <Text variant="bodySm" className="text-gray-800">
                See Issues identified and their reasons
              </Text>
            </div>

            <div className="bulk-evaluation-results-list flex-1 overflow-y-auto px-6 py-6">
              <div className="bulk-test-case-detail-sheet-panel flex flex-col p-6">
                <section>
                  <Text
                    variant="headingMd"
                    fontWeight="bold"
                    className="mb-0.5 block"
                  >
                    Full Input Text
                  </Text>
                  <div className="bulk-evaluation-sheet-prose max-w-none text-gray-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {testCase.inputPrompt}
                    </ReactMarkdown>
                  </div>
                </section>

                <Divider />

                <section>
                  <Text
                    variant="headingMd"
                    fontWeight="bold"
                    className="mb-0.5 block"
                  >
                    Model Output
                  </Text>
                  <div className="bulk-evaluation-sheet-prose max-w-none text-gray-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {testCase.modelOutput}
                    </ReactMarkdown>
                  </div>
                </section>

                {testCase.status === "FAILED" &&
                  (testCase.comments ||
                    testCase.idealOutput ||
                    (testCase.severity && testCase.issueLabel)) && (
                    <>
                      <Divider />
                      <section className="space-y-6">
                        {testCase.severity && testCase.issueLabel ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <Text
                              variant="bodyMd"
                              fontWeight="semibold"
                              className="text-gray-900"
                            >
                              Issue Identified
                            </Text>
                            <Tag
                              variation="filled"
                              fillColor={
                                getRiskTagColors(testCase.severity).fillColor
                              }
                              textColor={
                                getRiskTagColors(testCase.severity).textColor
                              }
                            >
                              {formatRiskLabel(
                                testCase.severity,
                                testCase.issueLabel
                              )}
                            </Tag>
                          </div>
                        ) : null}

                        {testCase.comments ? (
                          <div>
                            <Text
                              variant="bodyMd"
                              fontWeight="semibold"
                              className="mb-2 block text-gray-900"
                            >
                              Observations
                            </Text>
                            <div className="bulk-evaluation-sheet-prose max-w-none text-gray-800">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {testCase.comments}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ) : null}

                        {testCase.idealOutput ? (
                          <div>
                            <Text
                              variant="bodyMd"
                              fontWeight="semibold"
                              className="mb-2 block text-gray-900"
                            >
                              Ideal Output
                            </Text>
                            <div className="bulk-evaluation-sheet-prose max-w-none text-gray-800">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {testCase.idealOutput}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ) : null}
                      </section>
                    </>
                  )}

                {testCase.status === "PASSED" && (
                  <>
                    <Divider />
                    <section>
                      <Tag
                        variation="filled"
                        fillColor="#DCFCE7"
                        textColor="#15803D"
                      >
                        Passed
                      </Tag>
                    </section>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </Sheet.Content>
    </Sheet>
  );
};

export default ManualTestCaseDetailSheet;
