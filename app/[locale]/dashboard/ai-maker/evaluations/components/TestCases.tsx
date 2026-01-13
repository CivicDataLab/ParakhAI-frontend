"use client";

import React from "react";
import {
  Button,
  Text,
  TextField,
  Label,
  DataTable,
  DropZone,
  Icon,
} from "opub-ui";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import {
  IconClipboard,
  IconEye,
  IconCopy,
  IconUpload,
} from "@tabler/icons-react";
import { Icons } from "@/components/icons";

type PromptLibrary = {
  id: string;
  name: string;
  sector: string;
  module: string;
  owner: string;
};

interface TestCasesProps {
  selectedPromptLibraries: string[];
  setSelectedPromptLibraries: (selected: string[]) => void;
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  pastedTestCases: string;
  setPastedTestCases: (value: string) => void;
  testInputMode: "paste" | "upload";
  setTestInputMode: (mode: "paste" | "upload") => void;
  onPrevious: () => void;
  onRunAudit: () => void;
  isRequestingAudit: boolean;
}

const TestCases: React.FC<TestCasesProps> = ({
  selectedPromptLibraries,
  setSelectedPromptLibraries,
  uploadedFiles,
  setUploadedFiles,
  pastedTestCases,
  setPastedTestCases,
  testInputMode,
  setTestInputMode,
  onPrevious,
  onRunAudit,
  isRequestingAudit,
}) => {
  // Validation: Check if at least one test case source is provided
  const hasPromptLibraries = selectedPromptLibraries.length > 0;
  const hasCustomTestCases =
    (testInputMode === "paste" && pastedTestCases.trim().length > 0) ||
    (testInputMode === "upload" && uploadedFiles.length > 0);
  const hasTestCases = hasPromptLibraries || hasCustomTestCases;
  const validationError = !hasTestCases
    ? "Please select at least one prompt library or provide custom test cases (paste text or upload file)"
    : undefined;
  // Prompt libraries data
  const promptLibraries: PromptLibrary[] = [
    {
      id: "1",
      name: "Regional Prompts No. #1",
      sector: "Sector Name",
      module: "Bias & Fairness, Hallucin...",
      owner: "ParakhAI",
    },
    {
      id: "2",
      name: "Regional Prompts No. #2",
      sector: "Sector Name",
      module: "All Modules",
      owner: "ParakhAI",
    },
    {
      id: "3",
      name: "Regional Prompts No. #3",
      sector: "Sector Name",
      module: "Module name",
      owner: "ParakhAI",
    },
    {
      id: "4",
      name: "Regional Prompts No. #4",
      sector: "Sector Name",
      module: "Module name",
      owner: "ParakhAI",
    },
    {
      id: "5",
      name: "Regional Prompts No. #5",
      sector: "Sector Name",
      module: "Module name",
      owner: "ParakhAI",
    },
    {
      id: "6",
      name: "Regional Prompts No. #6",
      sector: "Sector Name",
      module: "Module name",
      owner: "ParakhAI",
    },
    {
      id: "7",
      name: "Regional Prompts No. #7",
      sector: "Sector Name",
      module: "Module name",
      owner: "ParakhAI",
    },
  ];

  const promptLibraryColumns: ColumnDef<PromptLibrary>[] = [
    {
      accessorKey: "name",
      header: "Name",
      enableSorting: true,
      cell: ({ getValue }) => (
        <a href="#" className="text-primary-purple hover:underline">
          {getValue<string>()}
        </a>
      ),
    },
    {
      accessorKey: "sector",
      header: "Sector",
    },
    {
      accessorKey: "module",
      header: "Module",
    },
    {
      accessorKey: "owner",
      header: "Owner",
    },
    {
      id: "preview",
      header: "Preview",
      enableSorting: false,
      cell: () => <Icon source={IconEye} size={20} color="success" />,
    },
  ];

  return (
    <div className="mb-8 space-y-8">
      {/* Select Prompt Library Section */}
      <div className="test-cases-table">
        <div className="mb-4">
          <Text
            variant="headingMd"
            className="select-prompt-library-heading block"
          >
            Select Prompt Library
          </Text>
          <Text
            variant="bodySm"
            className="select-prompt-library-subtitle block"
          >
            You can select multiple prompt libraries.
          </Text>
        </div>
        <DataTable
          rows={promptLibraries}
          columns={promptLibraryColumns}
          hideSelection={false}
          hideFooter={true}
          onRowSelectionChange={(selected) => {
            setSelectedPromptLibraries(selected as string[]);
          }}
        />
      </div>

      {/* Enter Your Own Test Cases Section */}
      <div>
        <Text variant="headingMd" className="enter-test-cases-heading mb-4">
          Enter Your Own Test Cases (optional)
        </Text>
        <div className="flex gap-1 mb-4 test-input-buttons-container">
          <Button
            kind="secondary"
            onClick={() => setTestInputMode("paste")}
            className={`test-input-button ${testInputMode === "paste" ? "test-input-button-selected" : ""}`}
          >
            <span className="test-input-icon-wrapper">
              <IconCopy
                size={16}
                className={`test-input-icon-copy ${testInputMode === "paste" ? "test-input-icon-selected" : "test-input-icon-unselected"}`}
              />
            </span>
            Paste Text
          </Button>
          <Button
            kind="secondary"
            onClick={() => setTestInputMode("upload")}
            className={`test-input-button ${testInputMode === "upload" ? "test-input-button-selected" : ""}`}
          >
            <span className="test-input-icon-wrapper">
              <IconUpload
                size={16}
                className={`test-input-icon-upload ${testInputMode === "upload" ? "test-input-icon-selected" : "test-input-icon-unselected"}`}
              />
            </span>
            Upload File
          </Button>
        </div>

        {testInputMode === "paste" ? (
          <div className="test-cases-input-wrapper">
            <Label className="audit-form-label evaluation-modules-label test-cases-label">
              <Text variant="bodySm" fontWeight="medium">
                Paste your test cases{" "}
                <span className="text-gray-500">(comma separated values)</span>
              </Text>
            </Label>
            <div className="test-cases-textarea-container">
              <TextField
                name="pastedTestCases"
                label="Paste your test cases"
                labelHidden
                multiline={6}
                value={pastedTestCases}
                onChange={(value) => setPastedTestCases(value)}
                placeholder={
                  "Input, Expected output, etc.\nInput, Expected output, etc.\n..."
                }
              />
              <div className="test-cases-format-warning">
                <Icon source={Icons.alert} size={16} color="critical" />
                <Text
                  variant="bodySm"
                  className="test-cases-format-warning-text"
                >
                  Your test cases should be comma separated values in the format{" "}
                  <strong>Input</strong>, <strong>Expected output</strong>, etc
                </Text>
              </div>
            </div>
          </div>
        ) : (
          <div className="test-cases-input-wrapper">
            <div className="test-cases-dropzone-container">
              <DropZone
                name="testCasesUpload"
                accept=".csv,.xls,.xlsx"
                onDrop={(files) => {
                  setUploadedFiles(files);
                }}
                outline
                overlay
              >
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <Text variant="bodySm" className="mb-6 text-gray-600">
                    Drag and drop file
                  </Text>
                  <DropZone.FileUpload
                    actionTitle="Choose File to Upload"
                    actionHint="Supported File Types: CSV XLS XLSX"
                  />

                  <Text variant="bodySm" className="mt-6">
                    <a href="#" className="text-primary-purple hover:underline">
                      Download ParakhAI's prompt template
                    </a>
                  </Text>
                </div>
              </DropZone>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-center gap-6 pt-8 border-t border-gray-200">
        <Button
          kind="secondary"
          onClick={onPrevious}
          className="previous-button"
        >
          <Image
            src="/images/icons/circle-arrow-left.png"
            alt="Circle arrow left"
            width={18}
            height={18}
            className="object-contain previous-icon"
          />
          <span className="previous-text">Previous</span>
        </Button>
        <Button
          kind="primary"
          onClick={() => {
            if (hasTestCases) {
              onRunAudit();
            }
          }}
          disabled={isRequestingAudit || !hasTestCases}
          className="run-audit-button"
        >
          <span className="run-audit-text">
            {isRequestingAudit ? "Running…" : "Run Evaluation"}
          </span>
          <Image
            src="/images/icons/circle-arrow-right.png"
            alt="Circle arrow right"
            width={18}
            height={18}
            className="object-contain run-audit-icon"
          />
        </Button>
      </div>
      {validationError && (
        <div className="mt-4 text-center">
          <Text variant="bodySm" className="text-red-600" color="critical">
            {validationError}
          </Text>
        </div>
      )}
    </div>
  );
};

export default TestCases;
