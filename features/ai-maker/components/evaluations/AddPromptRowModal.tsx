"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, TextField } from "opub-ui";
import type { CustomPromptRow, SelectOption } from "./types";

type AddPromptRowModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryOptions: SelectOption[];
  onSubmit: (row: Omit<CustomPromptRow, "id" | "selected">) => void;
};

type FormErrors = {
  input?: string;
  expectedOutput?: string;
};

const emptyForm = () => ({
  input: "",
  expectedOutput: "",
});

const isMisinformationCategoryOption = (option: SelectOption) => {
  const label = option.label.trim().toLowerCase();
  const value = option.value.trim().toLowerCase();

  return (
    label === "misinformation" ||
    label.includes("misinformation") ||
    value === "misinformation" ||
    value.includes("misinformation")
  );
};

const AddPromptRowModal = ({
  open,
  onOpenChange,
  categoryOptions,
  onSubmit,
}: AddPromptRowModalProps) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const isReferenceOutputRequired = useMemo(
    () => categoryOptions.some(isMisinformationCategoryOption),
    [categoryOptions],
  );

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
    if (isReferenceOutputRequired && !form.expectedOutput.trim()) {
      nextErrors.expectedOutput = "Reference output is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      input: form.input.trim(),
      expectedOutput: form.expectedOutput.trim(),
      category: "",
      riskType: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        title="Add Input Prompt"
        className="add-prompt-row-modal-content max-h-[calc(100vh-50vh)] overflow-y-scroll"
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
            maxHeight={104}
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
            requiredIndicator={isReferenceOutputRequired}
            required={isReferenceOutputRequired}
            multiline={4}
            maxHeight={104}
            value={form.expectedOutput}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, expectedOutput: value }));
              if (errors.expectedOutput) {
                setErrors((prev) => ({ ...prev, expectedOutput: undefined }));
              }
            }}
            error={errors.expectedOutput}
          />
        </div>
      </Dialog.Content>
    </Dialog>
  );
};

export default AddPromptRowModal;
