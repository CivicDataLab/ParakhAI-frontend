"use client";

import BreadCrumbs from "@/components/Breadcrumbs";
import { useGraphQL } from "@/lib/api";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, DataTable, ProgressBar, Tag, Text } from "opub-ui";
import { useEffect, useRef, useState } from "react";
import WelcomeSection from "../../../components/WelcomeSection";

// GraphQL query to fetch audit details
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
      overallScore
      findings
      recommendations
      errorMessage
      errorDetails
      createdAt
      startedAt
      completedAt
    }
  }
`;

// GraphQL query to fetch audit results
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

type Audit = {
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
  overallScore: number | null;
  findings: any;
  recommendations: any;
  errorMessage: string | null;
  errorDetails: any;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

type TestCase = {
  id: string;
  input: string;
  output: string;
  evaluationModule: string;
  evaluationMetric: string;
  riskSeverity: "High" | "Medium" | "Low" | "No risk";
  reason: string;
};

const EvaluationDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const evaluationId = params?.evaluationId as string;
  const locale = params?.locale || "en";

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

  // Refs to prevent duplicate API calls
  const isFetchingRef = useRef(false);
  const lastFetchedAuditIdRef = useRef<string | null>(null);

  // Fetch audit details
  useEffect(() => {
    if (!isAuthenticated || isSessionLoading || !evaluationId) return;
    if (isFetchingRef.current || lastFetchedAuditIdRef.current === evaluationId)
      return;

    isFetchingRef.current = true;

    const fetchAudit = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await request<{ audit: Audit }>(GET_AUDIT_QUERY, {
          auditId: evaluationId,
        });

        if (!data?.audit) {
          setError("Evaluation not found");
          return;
        }

        setAudit(data.audit);
        lastFetchedAuditIdRef.current = evaluationId;

        // If audit is completed, fetch results
        if (data.audit.status === "COMPLETED" || data.audit.completedAt) {
          await fetchResults();
        } else if (
          data.audit.status === "RUNNING" ||
          data.audit.status === "PENDING"
        ) {
          // Poll for completion
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
  }, [isAuthenticated, isSessionLoading, evaluationId, request]);

  // Fetch audit results
  const fetchResults = async () => {
    try {
      setIsLoadingResults(true);
      setResultsError(null);

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
      }>(GET_AUDIT_RESULTS_QUERY, { auditId: evaluationId });

      // Map GraphQL response to TestCase format
      const mappedResults: TestCase[] = (data?.auditResults || []).map(
        (result) => {
          const riskLevelMap: Record<
            string,
            "High" | "Medium" | "Low" | "No risk"
          > = {
            HIGH: "High",
            MEDIUM: "Medium",
            LOW: "Low",
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
    const pollInterval = 15000; // 15 seconds
    const maxPollTime = 300000; // 5 minutes
    const startTime = Date.now();

    const poll = async () => {
      if (Date.now() - startTime > maxPollTime) return;

      try {
        const data = await request<{ audit: Audit }>(GET_AUDIT_QUERY, {
          auditId: evaluationId,
        });

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

  // Format date for display
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

  // Calculate duration
  const getDuration = () => {
    if (!audit?.startedAt || !audit?.completedAt) return null;
    const start = new Date(audit.startedAt);
    const end = new Date(audit.completedAt);
    const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${seconds}s`;
  };

  // Get status tag color
  const getStatusColor = (status: string) => {
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

  // Test cases table columns
  const testCasesColumns: ColumnDef<TestCase>[] = [
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
        const colors = colorMap[severity];
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

  // Loading state
  if (isSessionLoading || isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <BreadCrumbs
          data={[
            { href: `/${locale}`, label: "Home" },
            { href: `/${locale}/dashboard`, label: "User Dashboard" },
            {
              href: `/${locale}/dashboard/ai-maker`,
              label: "AI Maker Dashboard",
            },
            {
              href: `/${locale}/dashboard/ai-maker/evaluations`,
              label: "Evaluations",
            },
            { href: "#", label: "Loading..." },
          ]}
        />
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center">
            <ProgressBar value={50} max={100} size="small" />
            <Text variant="bodySm" className="mt-4 text-gray-600">
              Loading evaluation...
            </Text>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !audit) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <BreadCrumbs
          data={[
            { href: `/${locale}`, label: "Home" },
            { href: `/${locale}/dashboard`, label: "User Dashboard" },
            {
              href: `/${locale}/dashboard/ai-maker`,
              label: "AI Maker Dashboard",
            },
            {
              href: `/${locale}/dashboard/ai-maker/evaluations`,
              label: "Evaluations",
            },
            { href: "#", label: "Error" },
          ]}
        />
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center">
            <Text variant="bodyMd" className="text-red-600 mb-4">
              {error || "Evaluation not found"}
            </Text>
            <Button
              kind="secondary"
              onClick={() =>
                router.push(`/${locale}/dashboard/ai-maker/evaluations`)
              }
            >
              Back to Evaluations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusColors = getStatusColor(audit.status);
  const duration = getDuration();
  const isRunning = audit.status === "RUNNING" || audit.status === "PENDING";

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-visible">
      <BreadCrumbs
        data={[
          { href: `/${locale}`, label: "Home" },
          { href: `/${locale}/dashboard`, label: "User Dashboard" },
          {
            href: `/${locale}/dashboard/ai-maker`,
            label: "AI Maker Dashboard",
          },
          {
            href: `/${locale}/dashboard/ai-maker/evaluations`,
            label: "Evaluations",
          },
          {
            href: "#",
            label: audit.name || `Evaluation #${audit.id.slice(0, 8)}`,
          },
        ]}
      />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 overflow-x-visible">
        <div className="flex flex-1 flex-col lg:flex-row gap-6 md:gap-8 lg:-ml-[120px] xl:-ml-[130px]">
          <WelcomeSection />

          <div className="flex-1 bg-gray-50 p-4 sm:p-6 lg:p-10 mt-6 lg:mt-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Text variant="headingLg" as="h1" fontWeight="bold">
                  {audit.name || `Evaluation #${audit.id.slice(0, 8)}`}
                </Text>
                <Tag
                  variation="filled"
                  fillColor={statusColors.fillColor}
                  textColor={statusColors.textColor}
                >
                  {audit.status}
                </Tag>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/${locale}/dashboard/ai-maker/evaluations`}>
                  <Button kind="secondary">Back to List</Button>
                </Link>
                <Link href={`/${locale}/dashboard/ai-maker/evaluations/new`}>
                  <Button kind="primary">New Evaluation</Button>
                </Link>
              </div>
            </div>

            {/* Running indicator */}
            {isRunning && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <ProgressBar value={60} max={100} size="small" />
                  <Text variant="bodySm" className="text-yellow-800">
                    Evaluation is in progress. Results will appear automatically
                    when complete.
                  </Text>
                </div>
              </div>
            )}

            {/* Error message */}
            {audit.errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <Text variant="bodySm" className="text-red-800">
                  <strong>Error:</strong> {audit.errorMessage}
                </Text>
              </div>
            )}

            {/* Overview Section */}
            <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
              <Text variant="headingMd" className="mb-4">
                Evaluation Overview
              </Text>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Text variant="bodySm" className="text-gray-500">
                    Evaluation ID
                  </Text>
                  <Text variant="bodyMd" fontWeight="medium">
                    {audit.id}
                  </Text>
                </div>
                <div>
                  <Text variant="bodySm" className="text-gray-500">
                    Model
                  </Text>
                  <Text variant="bodyMd" fontWeight="medium">
                    {audit.modelName || audit.modelId || "--"}
                  </Text>
                </div>
                <div>
                  <Text variant="bodySm" className="text-gray-500">
                    Created
                  </Text>
                  <Text variant="bodyMd" fontWeight="medium">
                    {formatDate(audit.createdAt)}
                  </Text>
                </div>
                <div>
                  <Text variant="bodySm" className="text-gray-500">
                    Completed
                  </Text>
                  <Text variant="bodyMd" fontWeight="medium">
                    {formatDate(audit.completedAt)}
                  </Text>
                </div>
                {duration && (
                  <div>
                    <Text variant="bodySm" className="text-gray-500">
                      Duration
                    </Text>
                    <Text variant="bodyMd" fontWeight="medium">
                      {duration}
                    </Text>
                  </div>
                )}
                <div>
                  <Text variant="bodySm" className="text-gray-500">
                    Modules
                  </Text>
                  <Text variant="bodyMd" fontWeight="medium">
                    {audit.modules?.join(", ") || "--"}
                  </Text>
                </div>
              </div>
            </div>

            {/* Test Results Summary */}
            {(audit.status === "COMPLETED" || audit.completedAt) && (
              <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
                <Text variant="headingMd" className="mb-4">
                  Results Summary
                </Text>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <Text variant="headingLg" fontWeight="bold">
                      {audit.totalTests || 0}
                    </Text>
                    <Text variant="bodySm" className="text-gray-500">
                      Total Tests
                    </Text>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <Text
                      variant="headingLg"
                      fontWeight="bold"
                      className="text-green-600"
                    >
                      {audit.passedTests || 0}
                    </Text>
                    <Text variant="bodySm" className="text-gray-500">
                      Passed
                    </Text>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <Text
                      variant="headingLg"
                      fontWeight="bold"
                      className="text-red-600"
                    >
                      {audit.failedTests || 0}
                    </Text>
                    <Text variant="bodySm" className="text-gray-500">
                      Failed
                    </Text>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg text-center">
                    <Text
                      variant="headingLg"
                      fontWeight="bold"
                      className="text-yellow-600"
                    >
                      {audit.skippedTests || 0}
                    </Text>
                    <Text variant="bodySm" className="text-gray-500">
                      Skipped
                    </Text>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <Text
                      variant="headingLg"
                      fontWeight="bold"
                      className="text-blue-600"
                    >
                      {audit.overallScore !== null
                        ? `${audit.overallScore.toFixed(1)}%`
                        : "--"}
                    </Text>
                    <Text variant="bodySm" className="text-gray-500">
                      Score
                    </Text>
                  </div>
                </div>
              </div>
            )}

            {/* Test Cases Table */}
            <div className="p-6 bg-white rounded-lg border border-gray-200">
              <Text variant="headingMd" className="mb-4">
                Test Cases
              </Text>

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
              ) : isRunning ? (
                <Text variant="bodySm" className="py-4 text-gray-600">
                  Results will appear here once the evaluation is complete.
                </Text>
              ) : (
                <Text variant="bodySm" className="py-4 text-gray-600">
                  No test results found.
                </Text>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-center gap-4 pt-8">
              <Button kind="primary" onClick={() => {}}>
                Download Report
              </Button>
              <Link
                href={`/${locale}/dashboard/ai-maker/evaluations/new`}
                className="text-primary-purple hover:underline"
              >
                Start a New Evaluation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationDetailPage;
