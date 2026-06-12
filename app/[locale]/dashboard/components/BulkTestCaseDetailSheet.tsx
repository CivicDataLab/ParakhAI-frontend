"use client";

import AddIssueModal, { type AddIssueFormData } from "./AddIssueModal";
import { Icons } from "@/components/icons";
import type { BulkTestCase, BulkTestCaseRisk } from "@/lib/bulkEvaluation/types";
import { ISSUE_TYPE_LABELS } from "@/lib/bulkEvaluation/types";
import { IconTrash } from "@tabler/icons-react";
import { Button, Divider, Icon, Select, Sheet, Text, TextField } from "opub-ui";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SEVERITY_OPTIONS = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const ISSUE_OPTIONS = ISSUE_TYPE_LABELS.map((label) => ({
  value: label.toLowerCase().replace(/\s+/g, "_"),
  label,
}));

type EditableIssue = BulkTestCaseRisk & { id: string };

type BulkTestCaseDetailSheetProps = {
  testCase: BulkTestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const BulkTestCaseDetailSheet = ({
  testCase,
  open,
  onOpenChange,
}: BulkTestCaseDetailSheetProps) => {
  const [issues, setIssues] = useState<EditableIssue[]>([]);
  const [isAddIssueModalOpen, setIsAddIssueModalOpen] = useState(false);

  useEffect(() => {
    if (!testCase) {
      setIssues([]);
      return;
    }

    setIssues(
      testCase.risks.map((risk, index) => ({
        ...risk,
        id: `${testCase.id}-risk-${index}`,
      }))
    );
  }, [testCase]);

  const handleObservationChange = (issueId: string, observation: string) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId ? { ...issue, observation } : issue
      )
    );
  };

  const handleSeverityChange = (
    issueId: string,
    severity: BulkTestCaseRisk["severity"]
  ) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId ? { ...issue, severity } : issue
      )
    );
  };

  const handleRemoveIssue = (issueId: string) => {
    setIssues((prev) => prev.filter((issue) => issue.id !== issueId));
  };

  const handleAddIssue = (data: AddIssueFormData) => {
    setIssues((prev) => [
      ...prev,
      {
        id: `${testCase?.id ?? "issue"}-risk-${Date.now()}`,
        label: data.label,
        severity: data.severity,
        observation: data.observation,
      },
    ]);
  };

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
                Input {testCase.index}
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

            <div className="flex-1 overflow-y-auto px-6 py-6">
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
                      {testCase.fullInputText}
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
                      {testCase.output}
                    </ReactMarkdown>
                  </div>
                </section>

                <Divider />
                <section>
                  <Text
                    variant="headingMd"
                    fontWeight="bold"
                    className="mb-4 block"
                  >
                    Issues Identified
                  </Text>
                  {issues.length > 0 && (
                    <div className="space-y-8">
                      {issues.map((issue, issueIndex) => (
                          <div key={issue.id} className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <Text
                                variant="bodyMd"
                                fontWeight="semibold"
                                className="shrink-0 text-gray-900"
                              >
                                Issue {issueIndex + 1}
                              </Text>
                              <div className="bulk-test-case-detail-issue-type-select w-48 shrink-0">
                                <Select
                                  name={`issue-type-${issue.id}`}
                                  label="Issue type"
                                  labelHidden
                                  options={[
                                    {
                                      value: issue.label,
                                      label: issue.label,
                                    },
                                  ]}
                                  value={issue.label}
                                  onChange={() => undefined}
                                  disabled
                                />
                              </div>
                              <div className="w-32 shrink-0">
                                <Select
                                  name={`severity-${issue.id}`}
                                  label="Severity"
                                  labelHidden
                                  options={SEVERITY_OPTIONS}
                                  value={issue.severity}
                                  onChange={(value) =>
                                    handleSeverityChange(
                                      issue.id,
                                      value as BulkTestCaseRisk["severity"]
                                    )
                                  }
                                  placeholder="High/med/low"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="bulk-test-case-detail-observations-header">
                                <Text
                                  variant="bodyMd"
                                  fontWeight="semibold"
                                  className="text-gray-900"
                                >
                                  Reasons and Observations (click to edit)
                                </Text>
                                <button
                                  type="button"
                                  className="bulk-test-case-detail-remove-issue"
                                  onClick={() => handleRemoveIssue(issue.id)}
                                  aria-label={`Remove issue ${issueIndex + 1}`}
                                >
                                  <IconTrash size={16} aria-hidden />
                                  Remove Issue
                                </button>
                              </div>
                              <TextField
                                name={`observation-${issue.id}`}
                                label="Reasons and Observations"
                                labelHidden
                                multiline={6}
                                value={issue.observation}
                                onChange={(value) =>
                                  handleObservationChange(issue.id, value)
                                }
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="custom-prompts-add-row justify-center">
                    <Button
                      kind="secondary"
                      onClick={() => setIsAddIssueModalOpen(true)}
                      className="!rounded-[8px]"
                    >
                      Add an issue
                    </Button>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </Sheet.Content>

      <AddIssueModal
        open={isAddIssueModalOpen}
        onOpenChange={setIsAddIssueModalOpen}
        issueOptions={ISSUE_OPTIONS}
        severityOptions={SEVERITY_OPTIONS}
        onSubmit={handleAddIssue}
      />
    </Sheet>
  );
};

export default BulkTestCaseDetailSheet;
