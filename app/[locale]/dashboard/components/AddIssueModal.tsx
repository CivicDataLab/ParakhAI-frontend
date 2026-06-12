"use client";

import type { BulkTestCaseRisk } from "@/lib/bulkEvaluation/types";
import { useEffect, useState } from "react";
import { Button, Dialog, Select, TextField } from "opub-ui";

export type AddIssueFormData = {
  label: string;
  severity: BulkTestCaseRisk["severity"];
  observation: string;
};

type SelectOption = { value: string; label: string };

type FormErrors = {
  issue?: string;
  severity?: string;
  observation?: string;
};

type AddIssueModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueOptions: SelectOption[];
  severityOptions: SelectOption[];
  onSubmit: (data: AddIssueFormData) => void;
};

const emptyForm = () => ({
  issue: "",
  severity: "",
  observation: "",
});

const AddIssueModal = ({
  open,
  onOpenChange,
  issueOptions,
  severityOptions,
  onSubmit,
}: AddIssueModalProps) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) {
      setForm(emptyForm());
      setErrors({});
    }
  }, [open]);

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.issue.trim()) {
      nextErrors.issue = "Issue is required";
    }
    if (!form.severity.trim()) {
      nextErrors.severity = "Risk level is required";
    }
    if (!form.observation.trim()) {
      nextErrors.observation = "Reasons or observations are required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const label =
      issueOptions.find((option) => option.value === form.issue)?.label ??
      form.issue;

    onSubmit({
      label,
      severity: form.severity as BulkTestCaseRisk["severity"],
      observation: form.observation.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        title="Add an Issue"
        footer={
          <div className="add-prompt-row-modal-footer flex w-full items-center justify-center gap-4">
            <Button
              kind="secondary"
              onClick={() => onOpenChange(false)}
              className="!flex-1 !rounded-[8px] !justify-center"
            >
              Cancel
            </Button>
            <Button
              kind="primary"
              onClick={handleSubmit}
              className="!flex-1 !rounded-[8px] !justify-center !border-none !bg-primaryPurple2 !text-white hover:!bg-[#6849EE]"
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 py-2">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select
              name="issue"
              label="Issue"
              requiredIndicator
              options={issueOptions}
              value={form.issue}
              placeholder="Select issue"
              onChange={(value) => {
                setForm((prev) => ({ ...prev, issue: value }));
                if (errors.issue) {
                  setErrors((prev) => ({ ...prev, issue: undefined }));
                }
              }}
              error={errors.issue}
            />

            <Select
              name="severity"
              label="Risk Level"
              requiredIndicator
              options={severityOptions}
              value={form.severity}
              placeholder="High/med/low"
              onChange={(value) => {
                setForm((prev) => ({ ...prev, severity: value }));
                if (errors.severity) {
                  setErrors((prev) => ({ ...prev, severity: undefined }));
                }
              }}
              error={errors.severity}
            />
          </div>

          <TextField
            name="observation"
            label="Reasons or Observations"
            requiredIndicator
            multiline={6}
            value={form.observation}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, observation: value }));
              if (errors.observation) {
                setErrors((prev) => ({ ...prev, observation: undefined }));
              }
            }}
            error={errors.observation}
          />
        </div>
      </Dialog.Content>
    </Dialog>
  );
};

export default AddIssueModal;
