"use client";

import { useGraphQL } from "@/lib/api";
import { IconDownload } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import Link from "next/link";
import { Button, DataTable, Icon, ProgressBar, Tag, Text } from "opub-ui";
import { useEffect, useRef, useState } from "react";

const GET_AUDIT_QUERY = `
  query GetAudit($auditId: ID!) {
    audit(auditId: $auditId) {
      id
      name
      modelId
      modelName
      status
      modules
      metrics
      configuration
      totalTests
      passedTests
      failedTests
      skippedTests
      errorMessage
      errorDetails
      createdAt
      startedAt
      completedAt
    }
  }
`;

const GET_AUDIT_RESULTS_QUERY = `
  query GetAuditResults($auditId: ID!) {
    auditResults(auditId: $auditId) {
      id
      riskLevel
      reason
      task {
        moduleDisplayName
        metricDisplayName
        test {
          testInput
          actualOutput
        }
      }
    }
  }
`;

const GET_AI_MODEL_NAME_QUERY = `
  query GetAiModelName($model_id: ID!) {
    aiModel(modelId: $model_id) {
      id
      name
      displayName
    }
  }
`;

export type Audit = {
  id: string;
  name: string;
  modelId: string;
  modelName: string | null;
  status: string;
  modules: string[];
  metrics: string[];
  configuration: any;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  errorMessage: string | null;
  errorDetails: any;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type TestCase = {
  id: string;
  input: string;
  output: string;
  evaluationModule: string;
  evaluationMetric: string;
  riskSeverity: "High" | "Medium" | "Low" | "No risk";
  reason: string;
};

export const formatModuleName = (moduleName: string): string => {
  const moduleMap: Record<string, string> = {
    BIAS_FAIRNESS: "Bias and Fairness",
    HALLUCINATION_MISINFORMATION: "Hallucination and MisInformation",
    PRIVACY_SAFETY: "Privacy and Safety",
  };

  if (moduleMap[moduleName]) {
    return moduleMap[moduleName];
  }

  return moduleName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
      return { fillColor: "#E2F5C4", textColor: "#166534" };
    case "RUNNING":
      return { fillColor: "#FEF3C7", textColor: "#92400E" };
    case "PENDING":
      return { fillColor: "#E0E7FF", textColor: "#3730A3" };
    case "FAILED":
    case "ERROR":
      return { fillColor: "#FEE2E2", textColor: "#DC2626" };
    default:
      return { fillColor: "#F3F4F6", textColor: "#374151" };
  }
};

export const testCasesColumns: ColumnDef<TestCase>[] = [
  {
    accessorKey: "input",
    header: "Input",
    enableSorting: true,
    cell: ({ getValue }) => getValue<string>(),
  },
  {
    accessorKey: "output",
    header: "Output",
    enableSorting: true,
    cell: ({ getValue }) => getValue<string>(),
  },
  {
    accessorKey: "evaluationModule",
    header: "Evaluation Module",
    enableSorting: true,
  },
  {
    accessorKey: "evaluationMetric",
    header: "Evaluation Metric",
    enableSorting: true,
  },
  {
    accessorKey: "riskSeverity",
    header: "Risk Severity",
    enableSorting: true,
    cell: ({ getValue }) => {
      const severity = getValue<"High" | "Medium" | "Low" | "No risk">();

      const colorMap = {
        High: { textColor: "#EF4444" },
        Medium: { textColor: "#F97316" },
        Low: { textColor: "#10B981" },
        "No risk": { textColor: "#000000" },
      };
      const colors = colorMap[severity as keyof typeof colorMap];
      return (
        <Tag
          variation="outlined"
          textColor={colors.textColor}
          borderColor="transparent"
        >
          {severity}
        </Tag>
      );
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    enableSorting: false,
    cell: ({ getValue }) => getValue<string>(),
  },
];

type EvaluationDetailProps = {
  evaluationId: string;
  backLink: string;
  backLinkText?: string;
  newEvaluationLink?: string;
  orgId?: string;
};

const EvaluationDetail = ({
  evaluationId,
  backLink,
  backLinkText = "Back to Evaluations",
  newEvaluationLink,
  orgId,
}: EvaluationDetailProps) => {
  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [testCasesData, setTestCasesData] = useState<TestCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const isFetchingRef = useRef(false);
  const lastFetchedAuditIdRef = useRef<string | null>(null);

  // Fetch audit results
  const fetchResults = async () => {
    try {
      setIsLoadingResults(true);
      setResultsError(null);

      const requestOptions = orgId ? { organization: orgId } : undefined;

      const data = await request<{
        auditResults: Array<{
          id: string;
          riskLevel: string;
          reason: string;
          task: {
            moduleDisplayName: string;
            metricDisplayName: string;
            test: {
              testInput: string;
              actualOutput: string;
            };
          };
        }>;
      }>(GET_AUDIT_RESULTS_QUERY, { auditId: evaluationId }, requestOptions);

      const mappedResults: TestCase[] = (data?.auditResults || []).map(
        (result) => {
          const riskLevelMap: Record<
            string,
            "High" | "Medium" | "Low" | "No risk"
          > = {
            HIGH_RISK: "High",
            MEDIUM_RISK: "Medium",
            LOW_RISK: "Low",
            NO_RISK: "No risk",
            NONE: "No risk",
          };

          return {
            id: result.id,
            input: result.task?.test?.testInput || "",
            output: result.task?.test?.actualOutput || "",
            evaluationModule: result.task?.moduleDisplayName || "",
            evaluationMetric: result.task?.metricDisplayName || "",
            riskSeverity:
              riskLevelMap[result.riskLevel?.toUpperCase()] || "No risk",
            reason: result.reason || "",
          };
        }
      );

      setTestCasesData(mappedResults);
    } catch (err: any) {
      console.error("Error fetching results:", err);
      setResultsError(err?.message || "Failed to load results");
    } finally {
      setIsLoadingResults(false);
    }
  };

  // Poll for audit completion
  const startPolling = () => {
    const pollInterval = 15000;
    const maxPollTime = 300000;
    const startTime = Date.now();

    const requestOptions = orgId ? { organization: orgId } : undefined;

    const poll = async () => {
      if (Date.now() - startTime > maxPollTime) return;

      try {
        const data = await request<{ audit: Audit }>(
          GET_AUDIT_QUERY,
          { auditId: evaluationId },
          requestOptions
        );

        if (data?.audit) {
          setAudit(data.audit);

          if (data.audit.status === "COMPLETED" || data.audit.completedAt) {
            await fetchResults();
            return;
          }

          if (data.audit.status === "FAILED" || data.audit.status === "ERROR") {
            return;
          }
        }

        setTimeout(poll, pollInterval);
      } catch (err) {
        console.error("Polling error:", err);
        setTimeout(poll, pollInterval);
      }
    };

    setTimeout(poll, pollInterval);
  };

  useEffect(() => {
    if (!isAuthenticated || isSessionLoading || !evaluationId) return;
    if (isFetchingRef.current || lastFetchedAuditIdRef.current === evaluationId)
      return;

    isFetchingRef.current = true;

    const requestOptions = orgId ? { organization: orgId } : undefined;

    const fetchAudit = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const auditData = await request<{ audit: Audit }>(
          GET_AUDIT_QUERY,
          { auditId: evaluationId },
          requestOptions
        );

        if (!auditData?.audit) {
          setError("Evaluation not found");
          return;
        }

        setAudit(auditData.audit);
        lastFetchedAuditIdRef.current = evaluationId;

        if (!auditData.audit.modelName && auditData.audit.modelId) {
          try {
            const modelData = await request<{
              aiModel: {
                id: string;
                name: string | null;
                displayName: string | null;
              };
            }>(GET_AI_MODEL_NAME_QUERY, { model_id: auditData.audit.modelId });

            if (modelData?.aiModel) {
              const displayName =
                modelData.aiModel.displayName ||
                modelData.aiModel.name ||
                auditData.audit.modelId;

              setAudit((prev) =>
                prev
                  ? {
                      ...prev,
                      modelName: displayName,
                    }
                  : prev
              );
            }
          } catch (modelErr) {
            console.error("Error fetching model name:", modelErr);
          }
        }

        if (
          auditData.audit.status === "COMPLETED" ||
          auditData.audit.completedAt
        ) {
          await fetchResults();
        } else if (
          auditData.audit.status === "RUNNING" ||
          auditData.audit.status === "PENDING"
        ) {
          startPolling();
        }
      } catch (err: any) {
        console.error("Error fetching audit:", err);
        setError(err?.message || "Failed to load evaluation");
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isSessionLoading, evaluationId, request, orgId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDuration = () => {
    if (!audit?.startedAt || !audit?.completedAt) return null;
    const start = new Date(audit.startedAt);
    const end = new Date(audit.completedAt);
    const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${seconds}s`;
  };

  const statusColors = getStatusColor(audit?.status || "");
  const duration = getDuration();
  const isRunning = audit?.status === "RUNNING" || audit?.status === "PENDING";

  const getPassRate = () => {
    if (!audit?.totalTests || !audit?.passedTests) return 0;
    return ((audit.passedTests / audit.totalTests) * 100).toFixed(2);
  };

  const getPassRateColor = () => {
    if (!audit?.totalTests || !audit?.passedTests) return "default";
    const passRate = parseFloat(getPassRate().toString());
    if (passRate >= 85) return "success";
    if (passRate >= 70) return "warning";
    return "critical";
  };

  if (isSessionLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ProgressBar value={50} max={100} size="small" />
        <Text variant="bodySm" className="mt-4 text-gray-600">
          Loading evaluation...
        </Text>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Text variant="bodyMd" className="text-red-600 mb-6 font-medium">
          {error || "Evaluation not found"}
        </Text>
        <Link href={backLink}>
          <Button kind="secondary">{backLinkText}</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex flex-row items-end gap-1">
            <Text variant="bodyMd" className="text-gray-500">
              Evaluation Name :{" "}
            </Text>
            <Text
              variant="headingMd"
              as="h4"
              fontWeight="semibold"
              className="evaluation-name-text"
            >
              {audit.name || `Evaluation #${audit.id.slice(0, 8)}`}
            </Text>
          </div>
          <Tag
            variation="filled"
            fillColor={statusColors.fillColor}
            textColor={statusColors.textColor}
          >
            {audit.status}
          </Tag>
        </div>
        <div className="flex items-center gap-3">
          <Link href={backLink}>
            <Button kind="primary">{backLinkText}</Button>
          </Link>
          {newEvaluationLink && (
            <Link href={newEvaluationLink}>
              <Button kind="secondary">New Evaluation</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Error message */}
      {audit.errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <Text variant="bodySm" className="text-red-800">
            <strong>Error:</strong> {audit.errorMessage}
          </Text>
        </div>
      )}

      <div className="mb-8 bg-white overview-evaluation-section ">
        <div className="flex p-6 items-center justify-between">
          <div className="flex flex-col gap-1">
            <Text variant="bodyMd" className="text-gray-500">
              Model Name :{" "}
            </Text>
            <Text variant="headingXl" className="font-bold text-gray-900">
              {audit.modelName}
            </Text>
          </div>
          <div className=" rounded-full">
            <Image
              src="/images/logos/CDL Logo.png"
              alt="CivicDataLab Logo"
              width={50}
              height={50}
              className="object-contain rounded-full cdl-round-logo"
            />
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="mb-8 bg-white overview-evaluation-section ">
        <div className="p-6">
          <div className="mb-5">
            <Text variant="headingMd" fontWeight="bold">
              Evaluation Overview
            </Text>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <Text variant="bodyMd" className="text-gray-500">
                  Evaluation ID :{" "}
                </Text>
                <Text variant="headingXl" className="font-bold text-gray-900">
                  {audit.id}
                </Text>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Text variant="bodyMd" className="text-gray-500">
                  Created :{" "}
                </Text>
                <Text variant="bodyMd" className="text-gray-900 font-medium">
                  {formatDate(audit.createdAt)}
                </Text>
              </div>
              <div>
                <Text variant="bodyMd" className="text-gray-500">
                  Completed :{" "}
                  <Text variant="bodyMd" className="text-gray-900 font-medium">
                    {formatDate(audit.completedAt)}
                  </Text>
                </Text>
              </div>
              {duration && (
                <div>
                  <Text variant="bodyMd" className="text-gray-500">
                    Duration :{" "}
                  </Text>
                  <Text variant="bodyMd" className="text-gray-900 font-medium">
                    {duration}
                  </Text>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Text variant="bodyMd" className="text-gray-500">
                  Modules :{" "}
                </Text>
                <Text variant="bodyMd" className="text-gray-900 font-medium">
                  {audit.modules?.map(formatModuleName).join(", ") || "--"}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {(audit.status === "COMPLETED" || audit.completedAt) && (
        <div className="mb-8 p-6 bg-white rounded-2xl border border-[#C4B8F3]">
          <div className="mb-5">
            <Text variant="headingMd" fontWeight="bold">
              Evaluation Summary
            </Text>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-8">
            <div className="result-summary-evaluation-section md:col-span-2 flex flex-col p-3 gap-4 justify-center">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400"
              >
                TOTAL PASS RATE
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  color={getPassRateColor()}
                  className="text-green-600"
                >
                  {getPassRate() || 0}%
                </Text>
              </div>
            </div>
            <div className="result-summary-evaluation-section flex flex-col p-3 gap-4 justify-center">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400"
              >
                PASSED TESTS
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-green-600"
                >
                  {audit.passedTests || 0}
                </Text>
              </div>
            </div>
            <div className="result-summary-evaluation-section flex flex-col p-3 gap-4 justify-center">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400"
              >
                FAILED TESTS
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-green-600"
                >
                  {audit.failedTests || 0}
                </Text>
              </div>
            </div>

            <div className="result-summary-evaluation-section flex flex-col p-3 gap-4 justify-center">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400"
              >
                SKIPPED TESTS
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-green-600"
                >
                  {audit.skippedTests || 0}
                </Text>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Cases */}
      <div className="p-6 bg-white rounded-2xl border border-[#C4B8F3]">
        <div className="mb-5">
          <Text variant="headingMd" fontWeight="bold">
            Test Cases
          </Text>
        </div>

        {isLoadingResults ? (
          <div className="flex items-center justify-center py-8">
            <ProgressBar value={50} max={100} size="small" />
            <Text variant="bodySm" className="ml-4">
              Loading results...
            </Text>
          </div>
        ) : resultsError ? (
          <Text variant="bodySm" className="text-red-600 py-4">
            {resultsError}
          </Text>
        ) : isRunning ? (
          <div className="block">
            <Text variant="bodySm" className="text-gray-600 whitespace-nowrap">
              Results will appear here once the evaluation is complete.
            </Text>
          </div>
        ) : testCasesData.length > 0 ? (
          <DataTable
            defaultRowCount={100}
            rows={testCasesData}
            columns={testCasesColumns}
            truncate={true}
            hoverable={true}
            sortColumns={[
              "input",
              "output",
              "evaluationModule",
              "evaluationMetric",
              "riskSeverity",
            ]}
            hideFooter={true}
            hideSelection={true}
          />
        ) : (
          <Text variant="bodySm" className="py-4 text-gray-600">
            No test results found.
          </Text>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-4 pt-8">
        <Button
          kind="secondary"
          icon={<Icon source={IconDownload} size={18} />}
          onClick={() => {}}
        >
          Download Report
        </Button>
        <Link href={backLink} className="text-primary-purple hover:underline">
          {backLinkText}
        </Link>
      </div>
    </>
  );
};

export default EvaluationDetail;
