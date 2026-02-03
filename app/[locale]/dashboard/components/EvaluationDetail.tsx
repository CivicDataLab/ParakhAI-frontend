"use client";

import { useGraphQL } from "@/lib/api";
import { IconDownload } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import Link from "next/link";
import { Button, DataTable, Icon, Spinner, Tag, Text } from "opub-ui";
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

const GET_MANUAL_TEST_CASES_QUERY = `
  query ManualTestCases($auditId: ID!) {
    manualTestCases(auditId: $auditId) {
      id
      module
      subModule
      inputPrompt
      modelOutput
      status
      issueType
      severity
      comments
      idealOutput
      createdAt
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

// GraphQL query to fetch audit summary
const GET_AUDIT_SUMMARY = `
  query GetSummaries($audit_id: ID!)
  {
    auditSummaries(auditId: $audit_id) {
      id
      audit {
        pk
      }
      status
      totalTests
      totalTasks
      totalResults
      aggregationMethod
      riskDistribution
      moduleSummary
      metricSummary
      toolSummary
      overallVerdict
      verdictReason
      recommendations
      auditorComments
      executiveSummary
      createdAt
      updatedAt
      auditReport {
        name
        size
        url
      }
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
  const [auditReport, setAuditReport] = useState<{
    name: string;
    size: number | null;
    url: string;
  } | null>(null);
  const [testCasesData, setTestCasesData] = useState<TestCase[]>([]);
  const [manualTestCases, setManualTestCases] = useState<Array<{
    id: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'PASSED' | 'FAILED';
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const isFetchingRef = useRef(false);
  const lastFetchedAuditIdRef = useRef<string | null>(null);
  const isReportReady = Boolean(auditReport?.url);

  // Fetch manual test cases
  const fetchManualTestCases = async () => {
    try {
      const requestOptions = orgId ? { organization: orgId } : undefined;

      const data = await request<{
        manualTestCases: Array<{
          id: string;
          severity?: 'LOW' | 'MEDIUM' | 'HIGH';
          status: 'PASSED' | 'FAILED';
        }>;
      }>(GET_MANUAL_TEST_CASES_QUERY, { auditId: evaluationId }, requestOptions);

      if (data?.manualTestCases) {
        setManualTestCases(data.manualTestCases);
      }
    } catch (err: any) {
      console.error("Error fetching manual test cases:", err);
      // Don't set error state here as manual test cases are optional
    }
  };

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
          // Preserve modelName if it exists in current state but not in new data
          setAudit((prev) => ({
            ...data.audit,
            modelName: data.audit.modelName || prev?.modelName || null,
          }));

          if (data.audit.status === "COMPLETED" || data.audit.completedAt) {
            await fetchResults();
            await fetchManualTestCases();
            await fetchAuditSummary();
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
          await fetchManualTestCases();
          await fetchAuditSummary();
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

  const fetchAuditSummary = async () => {
    const requestOptions = orgId ? { organization: orgId } : undefined;
    try {
      const data = await request<{
        auditSummaries: Array<{
          auditReport: {
            name: string;
            size: number | null;
            url: string;
          } | null;
        }>;
      }>(GET_AUDIT_SUMMARY, { audit_id: evaluationId }, requestOptions);

      const summary = data?.auditSummaries?.[0];
      if (summary?.auditReport) {
        setAuditReport(summary.auditReport);
      }
    } catch (err) {
      console.error("Error fetching audit summary:", err);
    }
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

  // Risk severity summary derived from testCasesData and manualTestCases
  const riskSummary = testCasesData.reduce(
    (acc, testCase) => {
      switch (testCase.riskSeverity) {
        case "Low":
          acc.low += 1;
          break;
        case "Medium":
          acc.medium += 1;
          break;
        case "High":
          acc.high += 1;
          break;
        default:
          break;
      }
      return acc;
    },
    { low: 0, medium: 0, high: 0 }
  );

  // Add manual test cases to risk summary (only count FAILED ones with severity)
  manualTestCases.forEach((testCase) => {
    if (testCase.status === 'FAILED' && testCase.severity) {
      switch (testCase.severity) {
        case 'LOW':
          riskSummary.low += 1;
          break;
        case 'MEDIUM':
          riskSummary.medium += 1;
          break;
        case 'HIGH':
          riskSummary.high += 1;
          break;
        default:
          break;
      }
    }
  });

  const totalIssuesIdentified =
    riskSummary.low + riskSummary.medium + riskSummary.high;

  if (isSessionLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Spinner />
        <Text variant="bodySm" className="text-gray-600">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-1">
            <Text variant="bodyMd" className="text-gray-500">
              Evaluation Name :{" "}
            </Text>
            <Text
              variant="headingMd"
              as="h4"
              fontWeight="semibold"
              className="evaluation-name-text break-words"
            >
              {audit.name || `Evaluation #${audit.id.slice(0, 8)}`}
            </Text>
          </div>
          <span className="self-start sm:self-auto">
            <Tag
              variation="filled"
              fillColor={statusColors.fillColor}
              textColor={statusColors.textColor}
            >
              {audit.status}
            </Tag>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={backLink} className="w-full sm:w-auto">
            <Button
              kind="primary"
              className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold !font-bold text-base !text-base w-full sm:w-auto"
            >
              {backLinkText}
            </Button>
          </Link>
          {/* {newEvaluationLink && (
            <Link href={newEvaluationLink}>
              <Button kind="secondary">New Evaluation</Button>
            </Link>
          )} */}
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
        <div className="flex flex-col sm:flex-row p-4 sm:p-6 items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Text variant="bodyMd" className="text-gray-500">
              Model Name :{" "}
            </Text>
            <Text
              variant="headingXl"
              className="font-bold text-gray-900 break-words"
            >
              {audit.modelName}
            </Text>
          </div>
          <div className="rounded-full flex-shrink-0">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <Text variant="bodyMd" className="text-gray-500">
                  Evaluation ID :{" "}
                </Text>
                <Text
                  variant="headingXl"
                  className="font-bold text-gray-900 break-words"
                >
                  {audit.id}
                </Text>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <Text variant="bodyMd" className="text-gray-500">
                  Created :{" "}
                </Text>
                <Text
                  variant="bodyMd"
                  className="text-gray-900 font-medium break-words"
                >
                  {formatDate(audit.createdAt)}
                </Text>
              </div>
              <div>
                <Text variant="bodyMd" className="text-gray-500">
                  Completed :{" "}
                </Text>
                <Text
                  variant="bodyMd"
                  className="text-gray-900 font-medium break-words"
                >
                  {formatDate(audit.completedAt)}
                </Text>
              </div>
              {duration && (
                <div>
                  <Text variant="bodyMd" className="text-gray-500">
                    Duration :{" "}
                  </Text>
                  <Text
                    variant="bodyMd"
                    className="text-gray-900 font-medium break-words"
                  >
                    {duration}
                  </Text>
                </div>
              )}
            </div>

            <div className="space-y-4 sm:col-span-2 md:col-span-1">
              <div>
                <Text variant="bodyMd" className="text-gray-500">
                  Modules :{" "}
                </Text>
                <Text
                  variant="bodyMd"
                  className="text-gray-900 font-medium break-words"
                >
                  {audit.modules?.map(formatModuleName).join(", ") || "--"}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {(audit.status === "COMPLETED" || audit.completedAt) && (
        <div className="mb-8 p-4 sm:p-6 bg-white rounded-2xl border border-[#C4B8F3]">
          <div className="mb-4 sm:mb-5">
            <Text variant="headingMd" fontWeight="bold">
              Evaluation Summary
            </Text>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 md:gap-8">
            <div className="result-summary-evaluation-section sm:col-span-2 md:col-span-2 lg:col-span-2 flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400 text-xs sm:text-sm"
              >
                TOTAL PASS RATE
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  color={getPassRateColor()}
                  className="text-green-600 text-xl sm:text-2xl"
                >
                  {getPassRate() || 0}%
                </Text>
              </div>
            </div>
            <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400 text-xs sm:text-sm"
              >
                PASSED TESTS
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-green-600 text-xl sm:text-2xl"
                >
                  {audit.passedTests || 0}
                </Text>
              </div>
            </div>
            <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400 text-xs sm:text-sm"
              >
                FAILED TESTS
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-green-600 text-xl sm:text-2xl"
                >
                  {audit.failedTests || 0}
                </Text>
              </div>
            </div>

            <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center sm:col-span-2 md:col-span-1 lg:col-span-1">
              <Text
                variant="headingSm"
                fontWeight="semibold"
                color="onBgDisabled"
                className="text-gray-400 text-xs sm:text-sm"
              >
                SKIPPED TESTS
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-green-600 text-xl sm:text-2xl"
                >
                  {audit.skippedTests || 0}
                </Text>
              </div>
            </div>
          </div>

          {/* Risk Severity Summary - Total Issues Identified */}
          <div className="mt-6 manual-eval-input-panel p-4 sm:p-6 bg-white">
            <div className="mb-4 flex items-baseline gap-2">
              <Text variant="bodyMd" className="text-gray-900">
                Total Issues Identified:
              </Text>
              <Text variant="bodyMd" className="text-[#E11D48] font-semibold">
                {totalIssuesIdentified}{" "}
                {totalIssuesIdentified === 1 ? "Issue" : "Issues"}
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Low Risk */}
              <div className="rounded-[16px] bg-[#EFF6FF] px-6 py-4 flex flex-col justify-center">
                <Text
                  variant="bodySm"
                  fontWeight="semibold"
                  className="text-xs text-gray-500 mb-2"
                >
                  LOW RISK
                </Text>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-[#2563EB] text-2xl"
                >
                  {riskSummary.low}
                </Text>
              </div>

              {/* Medium Risk */}
              <div className="rounded-[16px] bg-[#FFFBEB] px-6 py-4 flex flex-col justify-center">
                <Text
                  variant="bodySm"
                  fontWeight="semibold"
                  className="text-xs text-gray-500 mb-2"
                >
                  MEDIUM RISK
                </Text>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-[#92400E] text-2xl"
                >
                  {riskSummary.medium}
                </Text>
              </div>

              {/* High Risk */}
              <div className="rounded-[16px] bg-[#FEF2F2] px-6 py-4 flex flex-col justify-center">
                <Text
                  variant="bodySm"
                  fontWeight="semibold"
                  className="text-xs text-gray-500 mb-2"
                >
                  HIGH RISK
                </Text>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-[#E11D48] text-2xl"
                >
                  {riskSummary.high}
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
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Spinner />
            <Text variant="bodySm" className="text-gray-600">
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
          disabled={!isReportReady}
          icon={
            <Icon
              source={IconDownload}
              size={18}
              className={isReportReady ? "text-white" : "text-black"}
            />
          }
          onClick={() => {
            if (!auditReport?.url) return;
            window.open(auditReport.url, "_blank", "noopener,noreferrer");
          }}
          className={
            isReportReady
              ? "bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold !font-bold text-base !text-base [&_svg]:text-white [&_svg]:fill-white [&_svg]:stroke-white [&_*]:text-white [&_*]:fill-white [&_*]:stroke-white"
              : "bg-[#6849EE] hover:bg-[#6849EE] hover:!bg-[#6849EE] text-black hover:text-black hover:!text-black px-8 py-3 rounded-[8px] font-bold !font-bold text-base !text-base [&_svg]:text-black [&_svg]:fill-black [&_svg]:stroke-black [&_*]:text-black [&_*]:fill-black [&_*]:stroke-black"
          }
        >
          Download Report
        </Button>
        <Link href={backLink}>
          <Button
            kind="primary"
            className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold !font-bold text-base !text-base"
          >
            {backLinkText}
          </Button>
        </Link>
      </div>
    </>
  );
};

export default EvaluationDetail;
