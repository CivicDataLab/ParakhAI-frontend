"use client";

import AddIssueModal, { type AddIssueFormData } from "./AddIssueModal";
import { Icons } from "@/components/icons";
import { useGraphQL } from "@/lib/api";
import { UPDATE_AUDIT_RESULT_MUTATION } from "@/lib/bulkEvaluation/queries";
import type { BulkTestCase, BulkTestCaseRisk } from "@/lib/bulkEvaluation/types";
import { IconTrash } from "@tabler/icons-react";
import { Button, Divider, Icon, Select, Sheet, Text, TextField, toast } from "opub-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SEVERITY_OPTIONS = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const toRiskLevel = (severity: BulkTestCaseRisk["severity"]): string =>
  `${severity}_RISK`;

type EditableIssue = BulkTestCaseRisk & { id: string };

type BulkTestCaseDetailSheetProps = {
  testCase: BulkTestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditable?: boolean;
  orgId?: string;
  onIssuesChange?: (testCaseId: string, risks: BulkTestCaseRisk[]) => void;
};

const BulkTestCaseDetailSheet = ({
  testCase,
  open,
  onOpenChange,
  isEditable = false,
  orgId,
  onIssuesChange,
}: BulkTestCaseDetailSheetProps) => {
  const { request } = useGraphQL();
  const [issues, setIssues] = useState<EditableIssue[]>([]);
  const [isAddIssueModalOpen, setIsAddIssueModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  useEffect(() => {
    if (!testCase) {
      setIssues([]);
      for (const timer of saveTimersRef.current.values()) clearTimeout(timer);
      saveTimersRef.current.clear();
      return;
    }

    setIssues(
      testCase.risks.map((risk, index) => ({
        ...risk,
        id: `${testCase.id}-risk-${index}`,
      }))
    );
  }, [testCase]);

  useEffect(() => {
    return () => {
      for (const timer of saveTimersRef.current.values()) clearTimeout(timer);
      saveTimersRef.current.clear();
    };
  }, []);

  const saveAuditResult = useCallback(
    async (
      resultId: string,
      payload: {
        evaluatorRiskLevel?: string;
        evaluatorReason?: string;
        evaluatorSuccess?: boolean;
      }
    ) => {
      setIsSaving(true);
      try {
        const result = await request<{
          updateAuditResult: { success: boolean; message?: string | null };
        }>(
          UPDATE_AUDIT_RESULT_MUTATION,
          { input: { resultId, ...payload } },
          orgId ? { organization: orgId } : undefined
        );

        if (!result?.updateAuditResult?.success) {
          throw new Error(result?.updateAuditResult?.message || "Save failed");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save changes."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [orgId, request]
  );

  const scheduleSave = useCallback(
    (
      resultId: string,
      payload: {
        evaluatorRiskLevel?: string;
        evaluatorReason?: string;
        evaluatorSuccess?: boolean;
      },
      delay = 0
    ) => {
      const existing = saveTimersRef.current.get(resultId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        saveTimersRef.current.delete(resultId);
        void saveAuditResult(resultId, payload);
      }, delay);

      saveTimersRef.current.set(resultId, timer);
    },
    [saveAuditResult]
  );

  const handleSeverityChange = (
    issueId: string,
    severity: BulkTestCaseRisk["severity"]
  ) => {
    const updated = issues.map((issue) =>
      issue.id === issueId ? { ...issue, severity } : issue
    );
    setIssues(updated);
    if (testCase) onIssuesChange?.(testCase.id, updated);

    const issue = updated.find((item) => item.id === issueId);
    if (issue?.resultId) {
      scheduleSave(issue.resultId, { evaluatorRiskLevel: toRiskLevel(severity) });
    }
  };

  const handleObservationChange = (issueId: string, observation: string) => {
    const updated = issues.map((issue) =>
      issue.id === issueId ? { ...issue, observation } : issue
    );
    setIssues(updated);
    if (testCase) onIssuesChange?.(testCase.id, updated);

    const issue = updated.find((item) => item.id === issueId);
    if (issue?.resultId) {
      scheduleSave(issue.resultId, { evaluatorReason: observation }, 600);
    }
  };

  const handleRemoveIssue = (issueId: string) => {
    const issue = issues.find((item) => item.id === issueId);
    const updated = issues.filter((item) => item.id !== issueId);
    setIssues(updated);
    if (testCase) onIssuesChange?.(testCase.id, updated);

    if (issue?.resultId) {
      scheduleSave(
        issue.resultId,
        { evaluatorSuccess: true, evaluatorRiskLevel: "NO_RISK" }
      );
    }
  };

  const handleAddIssue = (data: AddIssueFormData) => {
    const updated = [
      ...issues,
      {
        id: `${testCase?.id ?? "issue"}-risk-${Date.now()}`,
        resultId: data.resultId,
        label: data.label,
        severity: data.severity,
        observation: data.observation,
      },
    ];
    setIssues(updated);
    if (testCase) onIssuesChange?.(testCase.id, updated);

    scheduleSave(data.resultId, {
      evaluatorSuccess: false,
      evaluatorRiskLevel: toRiskLevel(data.severity),
      evaluatorReason: data.observation,
    });
  };

  const addIssueOptions = (testCase?.allMetricResults ?? [])
    .filter((r) => !issues.some((i) => i.resultId === r.resultId))
    .map((r) => ({ value: r.resultId, label: r.label }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Sheet.Content
        side="right"
        size="wide"
        className="flex h-full flex-col overflow-hidden p-0"
      >
        {testCase && (
          <>
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <Text variant="headingLg" fontWeight="bold" className="block">
                  Input {testCase.index}
                </Text>
                {isEditable && isSaving && (
                  <Text variant="bodySm" className="text-gray-400">
                    Saving…
                  </Text>
                )}
              </div>
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
                {isEditable
                  ? "Changes are saved automatically."
                  : "See Issues identified and their reasons"}
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
                  {issues.length > 0 ? (
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
                                  { value: issue.label, label: issue.label },
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
                                  isEditable &&
                                  handleSeverityChange(
                                    issue.id,
                                    value as BulkTestCaseRisk["severity"]
                                  )
                                }
                                disabled={!isEditable}
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
                                {isEditable
                                  ? "Reasons and Observations (click to edit)"
                                  : "Reasons and Observations"}
                              </Text>
                              {isEditable && (
                                <button
                                  type="button"
                                  className="bulk-test-case-detail-remove-issue"
                                  onClick={() => handleRemoveIssue(issue.id)}
                                  aria-label={`Remove issue ${issueIndex + 1}`}
                                >
                                  <IconTrash size={16} aria-hidden />
                                  Remove Issue
                                </button>
                              )}
                            </div>
                            <TextField
                              name={`observation-${issue.id}`}
                              label="Reasons and Observations"
                              labelHidden
                              multiline={6}
                              value={issue.observation}
                              onChange={(value) =>
                                isEditable &&
                                handleObservationChange(issue.id, value)
                              }
                              readOnly={!isEditable}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text variant="bodySm" className="text-gray-500 block">
                      No issues identified for this input.
                    </Text>
                  )}

                  {isEditable && (
                    <div className="custom-prompts-add-row justify-center">
                      <Button
                        kind="secondary"
                        onClick={() => setIsAddIssueModalOpen(true)}
                        className="!rounded-[8px]"
                      >
                        Add an issue
                      </Button>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </Sheet.Content>

      <AddIssueModal
        open={isAddIssueModalOpen}
        onOpenChange={setIsAddIssueModalOpen}
        issueOptions={addIssueOptions}
        severityOptions={SEVERITY_OPTIONS}
        onSubmit={handleAddIssue}
      />
    </Sheet>
  );
};

export default BulkTestCaseDetailSheet;
