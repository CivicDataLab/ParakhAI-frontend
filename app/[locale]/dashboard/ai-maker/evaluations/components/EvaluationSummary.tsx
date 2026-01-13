"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button, Tag, Text, ProgressBar, DataTable } from "opub-ui";
import { BarChart } from "opub-ui/viz";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGraphQL } from "@/lib/api";

type TestCase = {
  id: string;
  input: string;
  output: string;
  evaluationModule: string;
  evaluationMetric: string;
  riskSeverity: "High" | "Medium" | "Low" | "No risk";
  reason: string;
};

interface EvaluationSummaryProps {
  auditOverview: {
    auditId: string | null;
    auditTime: string | null;
    durationSeconds: number | null;
  } | null;
  isRequestingAudit: boolean;
  auditError: string | null;
  onDownloadReport?: () => void;
}

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

const EvaluationSummary: React.FC<EvaluationSummaryProps> = ({
  auditOverview,
  isRequestingAudit,
  auditError,
  onDownloadReport,
}) => {
  const pathname = usePathname();
  const { request, isAuthenticated } = useGraphQL();

  // Get the base path and construct the new audit link with tab parameter
  const basePath =
    pathname?.replace(/\/[^/]+$/, "") || "/dashboard/ai-maker/audits";
  const newAuditLink = `${basePath}/new?tab=config`;

  // State for audit results data
  const [testCasesData, setTestCasesData] = useState<TestCase[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  // Refs to prevent duplicate API calls
  const isFetchingRef = useRef(false);
  const lastFetchedAuditIdRef = useRef<string | null>(null);
  const requestRef = useRef(request);

  // Keep request ref updated
  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  // Clear data when a new audit is requested
  useEffect(() => {
    if (isRequestingAudit) {
      setTestCasesData([]);
      setResultsError(null);
      // Reset refs when new audit starts
      lastFetchedAuditIdRef.current = null;
      isFetchingRef.current = false;
    }
  }, [isRequestingAudit]);

  // Fetch audit results when auditId is available
  useEffect(() => {
    const auditId = auditOverview?.auditId;

    // Early return conditions
    if (!auditId || !isAuthenticated || isRequestingAudit) {
      return;
    }

    // Prevent duplicate calls: check if already fetching or already fetched this auditId
    if (isFetchingRef.current || lastFetchedAuditIdRef.current === auditId) {
      return;
    }

    // Poll for audit results instead of fixed setTimeout
    const pollInterval = 15000; // Poll every 15 seconds
    const maxPollTime = 300000; // Maximum 5 minutes
    const startTime = Date.now();
    let pollTimeoutId: NodeJS.Timeout | null = null;

    const pollForResults = async () => {
      // Double-check conditions before polling
      if (!auditOverview?.auditId || auditOverview.auditId !== auditId) {
        return;
      }

      // Mark as fetching immediately to prevent race conditions
      isFetchingRef.current = true;
      setIsLoadingResults(true);
      setResultsError(null);

      // Store current auditId at start of fetch to check for race conditions
      const currentAuditId = auditId;

      try {
        // First check if audit is completed
        const auditStatusResult = await requestRef.current<{
          audit: {
            id: string;
            completedAt: string | null;
            status?: string;
          };
        }>(
          `
            query GetAuditById($auditId: ID!) {
              audit(auditId: $auditId) {
                id
                completedAt
                status
              }
            }
          `,
          { auditId: currentAuditId }
        );

        const auditStatus = auditStatusResult?.audit;
        const isCompleted =
          auditStatus?.completedAt !== null ||
          auditStatus?.status === "COMPLETED" ||
          auditStatus?.status === "completed";

        // Only fetch results if audit is completed

        if (isCompleted) {
          const data = await requestRef.current<{
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
          }>(GET_AUDIT_RESULTS_QUERY, { auditId: currentAuditId });

          // Only update state if auditId hasn't changed during fetch (prevent race conditions)
          if (
            auditOverview?.auditId === currentAuditId &&
            lastFetchedAuditIdRef.current !== currentAuditId
          ) {
            // Map GraphQL response to TestCase format
            const mappedResults: TestCase[] = (data?.auditResults || []).map(
              (result) => {
                // Map riskLevel to riskSeverity
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

                const riskSeverity =
                  riskLevelMap[result.riskLevel?.toUpperCase()] || "No risk";

                return {
                  id: result.id,
                  input: result.task?.test?.testInput || "",
                  output: result.task?.test?.actualOutput || "",
                  evaluationModule: result.task?.moduleDisplayName || "",
                  evaluationMetric: result.task?.metricDisplayName || "",
                  riskSeverity,
                  reason: result.reason || "",
                };
              }
            );

            setTestCasesData(mappedResults);
            lastFetchedAuditIdRef.current = currentAuditId;
            isFetchingRef.current = false;
            setIsLoadingResults(false);
            return; // Stop polling once we have results
          }
        } else {
          // Audit not completed yet, continue polling if within max time
          if (Date.now() - startTime < maxPollTime) {
            pollTimeoutId = setTimeout(pollForResults, pollInterval);
          } else {
            // Max time reached, stop polling
            setResultsError(
              "Audit is taking longer than expected. Please refresh the page."
            );
            isFetchingRef.current = false;
            setIsLoadingResults(false);
          }
          return;
        }
      } catch (error: any) {
        // Only set error if auditId hasn't changed during fetch
        if (auditOverview?.auditId === currentAuditId) {
          // Continue polling on error (might be temporary) if within max time
          if (Date.now() - startTime < maxPollTime) {
            pollTimeoutId = setTimeout(pollForResults, pollInterval);
          } else {
            setResultsError("Failed to load audit results. Please try again.");
            console.error("Error fetching audit results:", error);
            isFetchingRef.current = false;
            setIsLoadingResults(false);
          }
        }
      }
    };

    // Start polling after initial delay
    pollTimeoutId = setTimeout(pollForResults, pollInterval);

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
      }
    };
    // Only depend on auditId and auth status, not request function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditOverview?.auditId, isAuthenticated, isRequestingAudit]);

  const testCasesColumns: ColumnDef<TestCase>[] = [
    {
      accessorKey: "input",
      header: "Input",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="datatable-text-wrap">{getValue<string>()}</Text>
      ),
    },
    {
      accessorKey: "output",
      header: "Output",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="datatable-text-wrap">{getValue<string>()}</Text>
      ),
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
      cell: ({ getValue }) => (
        <Text className="datatable-text-wrap">{getValue<string>()}</Text>
      ),
    },
  ];

  return (
    <div className="mb-8 space-y-8">
      {/* Audit Overview Header */}
      <div className="audit-overview-section">
        <Text variant="headingMd" className="mb-4">
          Evaluation Overview
        </Text>
        <Text variant="bodySm" className="audit-overview-summary-text">
          {isRequestingAudit ? (
            <>
              <span className="audit-overview-highlight">Loading…</span>
              <br />
              Fetching audit data from backend. This may take a few moments.
            </>
          ) : auditOverview ? (
            <>
              <span style={{ whiteSpace: "nowrap" }}>
                Evaluation time:{" "}
                <span className="audit-overview-highlight">
                  {auditOverview.auditTime ?? "N/A"}
                </span>
              </span>
              <br />
              <span style={{ whiteSpace: "nowrap" }}>
                Evaluation ID:{" "}
                <span className="audit-overview-highlight">
                  {auditOverview.auditId ?? "N/A"}
                </span>
              </span>
              <br />
              <span style={{ whiteSpace: "nowrap" }}>
                Duration:{" "}
                <span className="audit-overview-highlight">
                  {auditOverview.durationSeconds != null
                    ? `${auditOverview.durationSeconds} s`
                    : "N/A"}
                </span>
              </span>
            </>
          ) : (
            "Run the audit to see results."
          )}
        </Text>
        {isRequestingAudit && !auditError && (
          <div className="mt-3 max-w-xs">
            <ProgressBar value={60} max={100} size="small" />
          </div>
        )}
        {auditError && (
          <Text variant="bodySm" className="text-red-600 mt-2">
            {auditError}
          </Text>
        )}
      </div>

      {/* Static Audit Summary + Module charts */}
      <div className="audit-results-cards">
        <div className="audit-summary-card">
          <Text variant="headingMd" className="mb-1">
            Evaluation Summary
          </Text>
          <Text variant="bodySm" className="mb-4">
            Total Issues Identified: 40
          </Text>
          <ProgressBar value={40} max={40} color="success" />
          <div className="audit-summary-legend">
            <span className="legend-item legend-low">Low (13)</span>
            <span className="legend-item legend-medium">Medium (24)</span>
            <span className="legend-item legend-high">High (3)</span>
          </div>
        </div>

        <div className="audit-modules-grid">
          {[1, 2, 3].map((index) => (
            <div key={index} className="audit-module-card">
              <Text variant="headingSm" className="mb-1">
                Module
              </Text>
              <Text variant="bodySm" className="mb-2">
                Issues Identified: 40
              </Text>
              <div className="audit-module-chart">
                <BarChart
                  options={{
                    grid: { left: 40, right: 16, top: 16, bottom: 30 },
                    tooltip: {
                      trigger: "axis",
                      axisPointer: { type: "shadow" },
                    },
                    legend: { bottom: 0 },
                    xAxis: {
                      type: "value",
                      boundaryGap: [0, 0.01],
                    },
                    yAxis: {
                      type: "category",
                      data: ["Module 4", "Module 3", "Module 2", "Module 1"],
                    },
                    series: [
                      {
                        name: "Low",
                        type: "bar",
                        stack: "issues",
                        itemStyle: { color: "#10B981" },
                        data: [3, 5, 4, 6],
                      },
                      {
                        name: "Medium",
                        type: "bar",
                        stack: "issues",
                        itemStyle: { color: "#FBBF24" },
                        data: [4, 6, 7, 5],
                      },
                      {
                        name: "High",
                        type: "bar",
                        stack: "issues",
                        itemStyle: { color: "#EF4444" },
                        data: [1, 2, 3, 1],
                      },
                    ],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Cases Table */}
      <div className="test-cases-table">
        <Text variant="headingMd" className="audit-results-test-cases-heading">
          Test Cases
        </Text>
        {isLoadingResults ? (
          <div className="flex items-center justify-center py-8">
            <ProgressBar value={50} max={100} size="small" />
            <Text variant="bodySm" className="ml-4">
              Loading audit results...
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
            hoverable={true}
            columns={testCasesColumns}
            truncate={true}
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
        ) : auditOverview?.auditId ? (
          <Text variant="bodySm" className="py-4 text-gray-600">
            No audit results found.
          </Text>
        ) : (
          <Text variant="bodySm" className="py-4 text-gray-600">
            Run the audit to see results.
          </Text>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-4 pt-8">
        <Button
          kind="primary"
          onClick={onDownloadReport}
          className="download-report-button"
        >
          Download Report
        </Button>
        <Link
          href={newAuditLink}
          className="text-primary-purple hover:underline start-new-audit-link"
        >
          Start a New Evaluation
        </Link>
      </div>
    </div>
  );
};

export default EvaluationSummary;
