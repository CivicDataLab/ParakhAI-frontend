"use client";

import { IconTrash } from "@tabler/icons-react";
import { Button, Combobox, Icon, Select, Text, TextField } from "opub-ui";
import { SEVERITY_OPTIONS, type SubModuleInfo } from "./types";

export type EvaluationIssueRow = {
  id: string;
  issueType: string;
  severity: string;
  observations: string;
  idealOutput: string;
};

export const createEvaluationIssueRow = (): EvaluationIssueRow => ({
  id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  issueType: "",
  severity: "",
  observations: "",
  idealOutput: "",
});

type EvaluateOutputSectionProps = {
  issueRows: EvaluationIssueRow[];
  subModules: SubModuleInfo[];
  onIssueRowsChange: (rows: EvaluationIssueRow[]) => void;
  onAddIssue: () => void;
  onSave: () => void;
  isSaving?: boolean;
  saveDisabled?: boolean;
};

const EvaluateOutputSection = ({
  issueRows,
  subModules,
  onIssueRowsChange,
  onAddIssue,
  onSave,
  isSaving = false,
  saveDisabled = false,
}: EvaluateOutputSectionProps) => {
  const issueOptions = subModules.map((sm) => ({
    value: sm.name,
    label: sm.displayName,
  }));

  const updateRow = (
    rowId: string,
    field: keyof Omit<EvaluationIssueRow, "id">,
    value: string
  ) => {
    onIssueRowsChange(
      issueRows.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
  };

  const removeRow = (rowId: string) => {
    if (issueRows.length <= 1) return;
    onIssueRowsChange(issueRows.filter((row) => row.id !== rowId));
  };

  return (
    <div className="evaluate-output-section space-y-4">
      <Text variant="headingMd" fontWeight="bold" className="block">
        Evaluate this output
      </Text>

      {issueRows.map((row, index) => (
        <div
          key={row.id}
          className="evaluate-output-issue-card relative rounded-2xl border border-gray-200 bg-white p-6 pr-12"
        >
          {issueRows.length > 1 && (
            <button
              type="button"
              className="evaluate-output-issue-card__delete absolute right-4 top-4"
              onClick={() => removeRow(row.id)}
              aria-label={`Remove issue ${index + 1}`}
            >
              <Icon source={IconTrash} size={18} />
            </button>
          )}

          <div className="evaluate-output-issue-grid">
            <div className="evaluate-output-issue-grid__left space-y-6">
              <div className="evaluate-output-issue-combobox">
                <Combobox
                  label="Issue"
                  requiredIndicator
                  name={`issue-${row.id}`}
                  required
                  placeholder="Select issue type"
                  list={issueOptions}
                  selectedValue={
                    subModules.find((sm) => sm.name === row.issueType)
                      ?.displayName ?? row.issueType
                  }
                  onChange={(value) => {
                    if (Array.isArray(value)) {
                      updateRow(
                        row.id,
                        "issueType",
                        value.length > 0 ? value[value.length - 1].value : ""
                      );
                      return;
                    }
                    updateRow(
                      row.id,
                      "issueType",
                      typeof value === "string" ? value : ""
                    );
                  }}
                />
              </div>

              <Select
                name={`severity-${row.id}`}
                label="Risk Severity"
                requiredIndicator
                required
                options={SEVERITY_OPTIONS}
                value={row.severity}
                onChange={(value) => updateRow(row.id, "severity", value)}
                placeholder="Select severity"
              />
            </div>

            <div className="evaluate-output-issue-grid__middle flex min-w-0 flex-col">
              <div className="audit-form-label evaluate-output-field-header-row">
                <Text
                  variant="bodyMd"
                  fontWeight="medium"
                  className="evaluate-output-field-header-row__label"
                >
                  Reasons or Observations
                  <span className="required-asterisk" aria-hidden="true">
                    *
                  </span>
                </Text>
                <button
                  type="button"
                  className="evaluate-output-ai-assist-link"
                >
                  Generate with AI Assistance
                </button>
              </div>
              <div className="comments-textfield-wrapper mt-2">
                <TextField
                  name={`observations-${row.id}`}
                  label="Reasons or Observations"
                  labelHidden
                  multiline={12}
                  value={row.observations}
                  onChange={(value) => updateRow(row.id, "observations", value)}
                  placeholder="Type here"
                />
              </div>
            </div>

            <div className="evaluate-output-issue-grid__right flex flex-col">
              <div className="audit-form-label">
                <Text variant="bodyMd" fontWeight="medium">
                  Ideal Output (optional)
                </Text>
              </div>
              <div className="comments-textfield-wrapper mt-2">
                <TextField
                  name={`idealOutput-${row.id}`}
                  label="Ideal Output"
                  labelHidden
                  multiline={12}
                  value={row.idealOutput}
                  onChange={(value) => updateRow(row.id, "idealOutput", value)}
                  placeholder="Type here"
                />
              </div>
              <Text variant="bodySm" className="mt-2 block text-gray-600">
                You can optionally add the best output the model could have
                given. Type the actual best output, not a description of it.
              </Text>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          kind="secondary"
          onClick={onAddIssue}
          disabled={saveDisabled}
          className="rounded-[6px]"
        >
          Add Issue
        </Button>
        <Button
          kind="secondary"
          onClick={onSave}
          disabled={saveDisabled || isSaving}
          className="rounded-[6px] bg-[#26007b] text-white hover:bg-[#4003c4] hover:text-white disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Test Case"}
        </Button>
      </div>
    </div>
  );
};

export default EvaluateOutputSection;
