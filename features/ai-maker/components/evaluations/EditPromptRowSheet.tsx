"use client";

import { Icons } from "@/components/icons";
import { useEffect, useMemo, useState } from "react";
import { Button, Icon, Sheet, Text, TextField } from "opub-ui";
import type { CustomPromptRow, SelectOption } from "./types";

type EditPromptRowSheetProps = {
  row: CustomPromptRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryOptions: SelectOption[];
  onSubmit: (rowId: string, data: Omit<CustomPromptRow, "id" | "selected">) => void;
};

type FormErrors = {
  input?: string;
  expectedOutput?: string;
};

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

const EditPromptRowSheet = ({
  row,
  open,
  onOpenChange,
  categoryOptions,
  onSubmit,
}: EditPromptRowSheetProps) => {
  const [input, setInput] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const isReferenceOutputRequired = useMemo(
    () => categoryOptions.some(isMisinformationCategoryOption),
    [categoryOptions],
  );

  useEffect(() => {
    if (!open || !row) {
      setInput("");
      setExpectedOutput("");
      setErrors({});
      return;
    }

    setInput(row.input);
    setExpectedOutput(row.expectedOutput);
    setErrors({});
  }, [open, row]);

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!input.trim()) {
      nextErrors.input = "Test input is required";
    }
    if (isReferenceOutputRequired && !expectedOutput.trim()) {
      nextErrors.expectedOutput = "Reference output is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!row || !validate()) return;

    onSubmit(row.id, {
      input: input.trim(),
      expectedOutput: expectedOutput.trim(),
      category: row.category,
      riskType: row.riskType,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Sheet.Content
        side="right"
        size="wide"
        className="flex h-full flex-col overflow-hidden p-0"
      >
        {row && (
          <>
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <Text variant="headingLg" fontWeight="bold" className="block">
                Edit Prompt
              </Text>
              <Button
                kind="tertiary"
                onClick={() => onOpenChange(false)}
                aria-label="Close edit panel"
              >
                <Icon source={Icons.cross} size={20} color="default" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="flex flex-col gap-5">
                <TextField
                  name="testInput"
                  label="Input"
                  requiredIndicator
                  multiline={6}
                  value={input}
                  onChange={(value) => {
                    setInput(value);
                    if (errors.input) {
                      setErrors((prev) => ({ ...prev, input: undefined }));
                    }
                  }}
                  error={errors.input}
                />

                <TextField
                  name="referenceOutput"
                  label="Expected Output"
                  requiredIndicator={isReferenceOutputRequired}
                  required={isReferenceOutputRequired}
                  multiline={6}
                  value={expectedOutput}
                  onChange={(value) => {
                    setExpectedOutput(value);
                    if (errors.expectedOutput) {
                      setErrors((prev) => ({ ...prev, expectedOutput: undefined }));
                    }
                  }}
                  error={errors.expectedOutput}
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button
                kind="secondary"
                onClick={() => onOpenChange(false)}
                className="!rounded-[8px]"
              >
                Cancel
              </Button>
              <Button
                kind="primary"
                onClick={handleSave}
                className="!rounded-[8px] !border-none !bg-primaryPurple2 !text-white hover:!bg-[#6849EE]"
              >
                Save
              </Button>
            </div>
          </>
        )}
      </Sheet.Content>
    </Sheet>
  );
};

export default EditPromptRowSheet;
