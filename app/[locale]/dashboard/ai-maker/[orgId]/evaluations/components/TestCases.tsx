"use client";

import { Icons } from "@/components/icons";
import { useGraphQL } from "@/lib/api";
import { IconCopy, IconEye, IconUpload } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import {
  Button,
  DataTable,
  DropZone,
  Icon,
  Label,
  Spinner,
  Text,
  TextField,
} from "opub-ui";
import React, { useEffect, useState } from "react";

type PromptDataset = {
  id: string;
  title: string;
  description?: string;
  taskType?: string;
  domain?: string;
  resourceCount: number;
  promptFormat?: string;
};

interface TestCasesProps {
  selectedPromptLibraries: any[];
  setSelectedPromptLibraries: (selected: any[]) => void;
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  pastedTestCases: string;
  setPastedTestCases: (value: string) => void;
  testInputMode: "paste" | "upload";
  setTestInputMode: (mode: "paste" | "upload") => void;
  onRunAudit: () => void;
  isRequestingAudit: boolean;
}

const PROMPT_DATASETS_QUERY = `
  query GetPromptDatasets($limit: Int, $isPublic: Boolean) {
    promptDatasets(limit: $limit, isPublic: $isPublic) {
      id
      title
      description
      promptMetadata {
        taskType
        domain
        targetLanguages
      }
      resources {
        id
        name
        promptFormat
        promptCount
      }
    }
  }
`;

const TestCases: React.FC<TestCasesProps> = ({
  selectedPromptLibraries,
  setSelectedPromptLibraries,
  uploadedFiles,
  setUploadedFiles,
  pastedTestCases,
  setPastedTestCases,
  testInputMode,
  setTestInputMode,
  onRunAudit,
  isRequestingAudit,
}) => {
  const { request, isAuthenticated } = useGraphQL();
  const [promptDatasets, setPromptDatasets] = useState<PromptDataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);

  // Validation: Check if at least one test case source is provided
  const hasPromptLibraries = selectedPromptLibraries.length > 0;
  const hasCustomTestCases =
    (testInputMode === "paste" && pastedTestCases.trim().length > 0) ||
    (testInputMode === "upload" && uploadedFiles.length > 0);
  const hasTestCases = hasPromptLibraries || hasCustomTestCases;
  const validationError = !hasTestCases
    ? "Please select at least one prompt dataset or provide custom test cases (paste text or upload file)"
    : undefined;

  // Fetch prompt datasets from DataSpace
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchPromptDatasets = async () => {
      try {
        setIsLoadingDatasets(true);
        setDatasetsError(null);

        const data = await request<{
          promptDatasets: Array<{
            id: string;
            title: string;
            description?: string;
            promptMetadata?: {
              taskType?: string;
              domain?: string;
              targetLanguages?: string[];
            };
            resources: Array<{
              id: string;
              name: string;
              promptFormat?: string;
              promptCount?: number;
            }>;
          }>;
        }>(PROMPT_DATASETS_QUERY, {
          limit: 50,
          isPublic: true,
        });

        const datasets = data?.promptDatasets || [];
        const formatted: PromptDataset[] = datasets.map((ds) => ({
          id: ds.id,
          title: ds.title,
          description: ds.description,
          taskType: ds.promptMetadata?.taskType,
          domain: ds.promptMetadata?.domain,
          resourceCount: ds.resources?.length || 0,
          promptFormat: ds.resources?.[0]?.promptFormat,
        }));

        setPromptDatasets(formatted);
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to load prompt datasets";
        setDatasetsError(errorMessage);
        console.error("Error fetching prompt datasets:", error);
      } finally {
        setIsLoadingDatasets(false);
      }
    };

    fetchPromptDatasets();
  }, [isAuthenticated, request]);

  const promptDatasetColumns: ColumnDef<PromptDataset>[] = [
    {
      accessorKey: "title",
      header: "Name",
      enableSorting: true,
      cell: ({ getValue }) => (
        <a href="#" className="text-primary-purple hover:underline">
          {getValue<string>()}
        </a>
      ),
    },
    {
      accessorKey: "taskType",
      header: "Task Type",
      cell: ({ getValue }) => {
        const value = getValue<string>();
        return value ? value.replace(/_/g, " ") : "-";
      },
    },
    {
      accessorKey: "domain",
      header: "Domain",
      cell: ({ getValue }) => {
        const value = getValue<string>();
        return value || "-";
      },
    },
    {
      accessorKey: "promptFormat",
      header: "Format",
      cell: ({ getValue }) => {
        const value = getValue<string>();
        return value ? value.replace(/_/g, " ") : "-";
      },
    },
    {
      accessorKey: "resourceCount",
      header: "Files",
      cell: ({ getValue }) => getValue<number>(),
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
      {/* Select Prompt Dataset Section */}
      <div className="test-cases-table mt-6">
        <div className="mb-4">
          <Text
            variant="headingMd"
            className="select-prompt-library-heading block whitespace-nowrap"
          >
            Select Prompt Datasets
          </Text>
          <Text
            variant="bodySm"
            className="select-prompt-library-subtitle block whitespace-nowrap"
          >
            You can select multiple prompt datasets from DataSpace.
          </Text>
        </div>
        {isLoadingDatasets ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Spinner />
            <Text variant="bodySm" className="text-gray-600">
              Loading prompt datasets...
            </Text>
          </div>
        ) : datasetsError ? (
          <div className="py-8 text-center">
            <Text variant="bodySm" className="text-red-600">
              {datasetsError}
            </Text>
          </div>
        ) : promptDatasets.length === 0 ? (
          <div className="py-8 text-center">
            <Text variant="bodySm" className="text-gray-600">
              No prompt datasets available. Please create prompt datasets in
              DataSpace first.
            </Text>
          </div>
        ) : (
          <DataTable
            rows={promptDatasets}
            columns={promptDatasetColumns}
            hideSelection={false}
            hideFooter={true}
            defaultSelectedRows={selectedPromptLibraries}
            onRowSelectionChange={(selected) => {
              setSelectedPromptLibraries(selected as any[]);
            }}
          />
        )}
      </div>

      {/* Enter Your Own Test Cases Section */}
      <div>
        <Text variant="headingMd" className="enter-test-cases-heading mb-4">
          Enter Your Own Test Cases (Optional)
        </Text>
        <div className="flex gap-6 mb-4 test-input-buttons-container">
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
            disabled
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
              <div className="flex items-center gap-2 mt-2 text-black [&_svg]:text-black [&_svg]:fill-black [&_svg]:stroke-black">
                <Icon
                  source={Icons.alert}
                  size={16}
                  className="flex-shrink-0"
                />
                <Text variant="bodySm" className="text-black">
                  Your test cases should be comma separated values in the format{" "}
                  <strong className="text-black">Input</strong>,{" "}
                  <strong className="text-black">Expected output</strong>, etc
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
