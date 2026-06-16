"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, Select, Text, TextField } from "opub-ui";
import type { CustomPromptRow, SelectOption } from "./types";

const RISK_TYPE_OPTIONS: SelectOption[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

type AddPromptRowModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryOptions: SelectOption[];
  onSubmit: (row: Omit<CustomPromptRow, "id" | "selected">) => void;
};

type FormErrors = {
  input?: string;
  expectedOutput?: string;
  category?: string;
  riskType?: string;
};

const emptyForm = () => ({
  input: "",
  expectedOutput: "",
  category: "",
  riskType: "",
});

const AddPromptRowModal = ({
  open,
  onOpenChange,
  categoryOptions,
  onSubmit,
}: AddPromptRowModalProps) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const riskTypeOptions = useMemo(() => RISK_TYPE_OPTIONS, []);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm());
      setErrors({});
    }
  }, [open]);

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.input.trim()) {
      nextErrors.input = "Test input is required";
    }
    if (!form.expectedOutput.trim()) {
      nextErrors.expectedOutput = "Reference output is required";
    }
    if (!form.category.trim()) {
      nextErrors.category = "Category is required";
    }
    if (!form.riskType.trim()) {
      nextErrors.riskType = "Risk type is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      input: form.input.trim(),
      expectedOutput: form.expectedOutput.trim(),
      category: form.category.trim(),
      riskType: form.riskType.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        title="Add an issue"
        footer={
          <div className="add-prompt-row-modal-footer flex w-full items-center justify-center gap-4">
            <Button
              kind="secondary"
              onClick={() => onOpenChange(false)}
              className="!flex-1 !rounded-[8px] !justify-center"
            >
              Back
            </Button>
            <Button
              kind="primary"
              onClick={handleSubmit}
              className="!flex-1 !rounded-[8px] !justify-center !border-none !bg-primaryPurple2 !text-white hover:!bg-[#6849EE]"
            >
              Next
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 py-2">
          <TextField
            name="testInput"
            label="Test Input"
            requiredIndicator
            multiline={4}
            value={form.input}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, input: value }));
              if (errors.input) {
                setErrors((prev) => ({ ...prev, input: undefined }));
              }
            }}
            error={errors.input}
          />

          <TextField
            name="referenceOutput"
            label="Reference Output"
            requiredIndicator
            multiline={4}
            value={form.expectedOutput}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, expectedOutput: value }));
              if (errors.expectedOutput) {
                setErrors((prev) => ({ ...prev, expectedOutput: undefined }));
              }
            }}
            error={errors.expectedOutput}
          />

          <Select
            name="category"
            label="Category"
            requiredIndicator
            options={categoryOptions}
            value={form.category}
            placeholder={
              categoryOptions.length > 0
                ? "Select category"
                : "Select evaluation modules first"
            }
            onChange={(value) => {
              setForm((prev) => ({ ...prev, category: value }));
              if (errors.category) {
                setErrors((prev) => ({ ...prev, category: undefined }));
              }
            }}
            error={errors.category}
          />

          <Select
            name="riskType"
            label="Risk Type"
            requiredIndicator
            options={riskTypeOptions}
            value={form.riskType}
            placeholder="Select risk type"
            onChange={(value) => {
              setForm((prev) => ({ ...prev, riskType: value }));
              if (errors.riskType) {
                setErrors((prev) => ({ ...prev, riskType: undefined }));
              }
            }}
            error={errors.riskType}
          />
        </div>
      </Dialog.Content>
    </Dialog>
  );
};

export default AddPromptRowModal;
