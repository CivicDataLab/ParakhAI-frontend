"use client";

import { useGraphQL } from "@/lib/api";
import { IconDownload, IconMinus, IconPlus } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import {
  Button,
  Icon,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Tag,
  Text,
  TextField,
  toast,
} from "opub-ui";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SeverityBarChart } from "./SeverityBarChart";

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
      evaluationMode
      auditType
      totalTests
      passedTests
      failedTests
      skippedTests
      errorMessage
      errorDetails
      createdAt
      startedAt
      completedAt
      evaluationMode
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

const GET_AUDIT_RESULTS_SUMMARY_QUERY = `
  query GetAuditResultSamples($auditId: ID!) {
    resultSamples(auditId: $auditId) {
      __typename

      ... on ManualModuleSamples {
        name
        displayName
        metrics {
          name
          displayName
          samples {
            testInput
            actualOutput
            comments
            severity
          }
        }
      }

      ... on AutomatedModuleSamples {
        name
        displayName
        metrics {
          name
          displayName
          samples {
            test {
              testInput
              actualOutput
            }
            result {
              riskLevel
              reason
              score
            }
          }
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
      hasReport
      auditReport {
        name
        size
        url
      }
    }
  }
`;

// Mutation to update an existing audit (same as NewEvaluationContent)
const UPDATE_AUDIT_MUTATION = `
  mutation UpdateAudit($input: UpdateAuditInput!) {
    updateAudit(input: $input) {
      success
      message
      audit {
        id
        name
        status
        modules
        metrics
        modelId
        modelVersionId
        testDatasetIds
        configuration
      }
    }
  }
`;

export type Audit = {
  auditType: string;
  evaluationMode: string;
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

type ModuleIssue = {
  id: string;
  module: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  status: "PASSED" | "FAILED";
  issueType: string;
  input: string;
  output: string;
  comments?: string;
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
    case "MANUAL":
      return { fillColor: "#d6d7d8", textColor: "#374151" };
    case "AUTOMATED":
      return { fillColor: "#d6d7d8", textColor: "#374151" };
    default:
      return { fillColor: "#d6d7d8", textColor: "#374151" };
  }
};
/**
 * Tag colors for issue severity.
 * Matches the old table legend where:
 * - High  => red (#EF4444)
 * - Medium => orange (#F97316)
 * - Low => green (#10B981)
 */
export const getSeverityTagColors = (
  severity: "LOW" | "MEDIUM" | "HIGH"
): { fillColor: string; textColor: string } => {
  switch (severity?.toUpperCase()) {
    case "HIGH":
      // Red
      return { fillColor: "#FEF2F2", textColor: "#E11D48" };
    case "MEDIUM":
      // Orange
      return { fillColor: "#FFFBEB", textColor: "#92400E" };
    case "LOW":
      // Green
      return { fillColor: "#EFF6FF", textColor: "#2563EB" };
    default:
      return { fillColor: "#F3F4F6", textColor: "#374151" };
  }
};

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
    accessToken,
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
  const [manualTestCases, setManualTestCases] = useState<
    Array<{
      id: string;
      severity?: "LOW" | "MEDIUM" | "HIGH";
      status: "PASSED" | "FAILED";
    }>
  >([]);
  const [apiModuleIssues, setApiModuleIssues] = useState<ModuleIssue[]>([]);
  const [metricSummary, setMetricSummary] = useState<Record<string, Record<string, { risk_distribution: Record<string, number> }>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [expandedIssueIds, setExpandedIssueIds] = useState<Set<string>>(
    new Set()
  );
  const [editableName, setEditableName] = useState<string>("");
  const [isSavingName, setIsSavingName] = useState(false);

  const isFetchingRef = useRef(false);
  const lastFetchedAuditIdRef = useRef<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const isReportReady = Boolean(auditReport?.url);

  const downloadReport = async () => {
    if (!evaluationId || isDownloading) return;
    setIsDownloading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/$/, "");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      if (orgId) headers["organization"] = orgId;

      const res = await fetch(
        `${backendUrl}/api/audits/${evaluationId}/report/download/`,
        { method: "GET", headers }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail || `Download failed (${res.status})`);
      }

      const { url, name } = await res.json();
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "audit_report.pdf";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Report download failed:", err);
      alert(err?.message || "Failed to download report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Fetch manual test cases
  const fetchManualTestCases = async () => {
    try {
      const requestOptions = orgId ? { organization: orgId } : undefined;

      const data = await request<{
        manualTestCases: Array<{
          id: string;
          severity?: "LOW" | "MEDIUM" | "HIGH";
          status: "PASSED" | "FAILED";
        }>;
      }>(
        GET_MANUAL_TEST_CASES_QUERY,
        { auditId: evaluationId },
        requestOptions
      );

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
            await fetchResultSamples();
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
          await fetchResultSamples();
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
          hasReport: boolean;
          metricSummary: Record<string, Record<string, { risk_distribution: Record<string, number> }>> | null;
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
      if (summary?.metricSummary) {
        setMetricSummary(summary.metricSummary);
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
  const evaluationMode = getStatusColor(audit?.evaluationMode || "");
  const duration = getDuration();
  const isRunning = audit?.status === "RUNNING" || audit?.status === "PENDING";

  useEffect(() => {
    if (audit) {
      const fallbackName = audit.id ? `Evaluation #${audit.id.slice(0, 8)}` : "";
      setEditableName(audit.name || fallbackName);
    }
  }, [audit?.id, audit?.name]);

  const saveEvaluationName = async () => {
    if (!audit || isSavingName) return;
    const trimmedName = editableName?.trim();
    if (!trimmedName || trimmedName === audit.name) return;

    try {
      setIsSavingName(true);
      const requestOptions = orgId ? { organization: orgId } : undefined;
      const result = await request<{
        updateAudit: {
          success: boolean;
          message?: string | null;
          audit?: { id: string; name: string };
        };
      }>(
        UPDATE_AUDIT_MUTATION,
        {
          input: {
            auditId: audit.id,
            name: trimmedName,
            auditType: audit.auditType,
            evaluationMode: audit.evaluationMode,
            modules: audit.modules,
            metrics: audit.metrics,
            configuration: audit.configuration,
          },
        },
        requestOptions
      );

      if (!result?.updateAudit?.success) {
        const msg =
          result?.updateAudit?.message ||
          "Failed to save evaluation name on the server.";
        toast.error(msg);
      } else if (result.updateAudit.audit?.name) {
        setAudit((prev) =>
          prev ? { ...prev, name: result.updateAudit.audit!.name } : prev
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save evaluation name. Please try again.";
      toast.error(msg);
    } finally {
      setIsSavingName(false);
    }
  };

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
    if (testCase.status === "FAILED" && testCase.severity) {
      switch (testCase.severity) {
        case "LOW":
          riskSummary.low += 1;
          break;
        case "MEDIUM":
          riskSummary.medium += 1;
          break;
        case "HIGH":
          riskSummary.high += 1;
          break;
        default:
          break;
      }
    }
  });

  const totalIssuesIdentified =
    riskSummary.low + riskSummary.medium + riskSummary.high;

  const hasVisualizationDataForModule = (moduleName: string) => {
    const issuesForModule = apiModuleIssues.filter(
      (issue) => issue.module === moduleName
    );
    return issuesForModule.length > 0;
  };

  const modulesWithVisualizationData =
    audit?.modules?.filter((moduleName) =>
      hasVisualizationDataForModule(moduleName)
    ) || [];

  const toggleIssueCard = (issueId: string) => {
    setExpandedIssueIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  const fetchResultSamples = async () => {
    const requestOptions = orgId ? { organization: orgId } : undefined;
    try {
      const data = await request<{
        resultSamples: Array<
          | {
              __typename: "ManualModuleSamples";
              name: string;
              displayName: string;
              metrics: Array<{
                name: string;
                displayName: string;
                samples: Array<{
                  testInput: string;
                  actualOutput: string;
                  comments?: string | null;
                  severity?: "LOW" | "MEDIUM" | "HIGH" | null;
                }>;
              }>;
            }
          | {
              __typename: "AutomatedModuleSamples";
              name: string;
              displayName: string;
              metrics: Array<{
                name: string;
                displayName: string;
                samples: Array<{
                  test: {
                    testInput: string;
                    actualOutput: string;
                  };
                  result: {
                    riskLevel: string;
                    reason: string;
                    score: number | null;
                  };
                }>;
              }>;
            }
        >;
      }>(
        GET_AUDIT_RESULTS_SUMMARY_QUERY,
        { auditId: evaluationId },
        requestOptions
      );

      const collectedIssues: ModuleIssue[] = [];

      (data?.resultSamples || []).forEach((sampleGroup) => {
        if (!sampleGroup) return;

        const resolveModuleId = () => {
          if (!audit?.modules?.length) return sampleGroup.name;
          const modules = audit.modules;

          const exact = modules.find((m) => m === sampleGroup.name);
          if (exact) return exact;

          const byDisplay = modules.find(
            (m) =>
              formatModuleName(m).toLowerCase() ===
              sampleGroup.displayName.toLowerCase()
          );
          return byDisplay || sampleGroup.name;
        };

        const moduleId = resolveModuleId();

        if (sampleGroup.__typename === "ManualModuleSamples") {
          sampleGroup.metrics?.forEach((metric) => {
            metric.samples?.forEach((sample, index) => {
              collectedIssues.push({
                id: `${moduleId}-${metric.name}-manual-${index}`,
                module: moduleId,
                severity: (sample.severity || "LOW") as
                  | "LOW"
                  | "MEDIUM"
                  | "HIGH",
                status: "FAILED",
                issueType: metric.displayName || metric.name,
                input: sample.testInput,
                output: sample.actualOutput,
                comments: sample.comments || undefined,
              });
            });
          });
        }

        if (sampleGroup.__typename === "AutomatedModuleSamples") {
          sampleGroup.metrics?.forEach((metric) => {
            metric.samples?.forEach((sample, index) => {
              const riskLevel = sample.result?.riskLevel || "";

              // Skip clearly no-risk samples from "issues" list
              if (riskLevel.toUpperCase() === "NO_RISK") {
                return;
              }

              let severity: "LOW" | "MEDIUM" | "HIGH" = "LOW";
              const upperRisk = riskLevel.toUpperCase();
              if (upperRisk.includes("HIGH")) severity = "HIGH";
              else if (upperRisk.includes("MEDIUM")) severity = "MEDIUM";

              collectedIssues.push({
                id: `${moduleId}-${metric.name}-auto-${index}`,
                module: moduleId,
                severity,
                status: "FAILED",
                issueType: metric.displayName || metric.name,
                input: sample.test?.testInput || "",
                output: sample.test?.actualOutput || "",
                comments: sample.result?.reason || undefined,
              });
            });
          });
        }
      });

      setApiModuleIssues(collectedIssues);
    } catch (err) {
      console.error("Error fetching result samples:", err);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1">
            <Text variant="bodyMd" className="text-gray-500 whitespace-nowrap mr-2">
              Evaluation Name :{" "}
            </Text>
            <div
              className="audit-name-input-wrapper max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveEvaluationName();
                }
              }}
            >
              <TextField
                id="evaluationName"
                name="evaluationName"
                label="Evaluation Name"
                labelHidden
                value={editableName}
                onBlur={saveEvaluationName}
                onChange={(value) => setEditableName(value)}
              />
            </div>
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
          <span className="self-start sm:self-auto">
            <Tag
              variation="filled"
              fillColor={evaluationMode.fillColor}
              textColor={evaluationMode.textColor}
            >
              {audit.evaluationMode}
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
              <div>
                <Text variant="bodyMd" className="text-gray-500">
                  Evaluation Type :{" "}
                </Text>
                <Text
                  variant="bodyMd"
                  className="text-gray-900 font-medium break-words"
                >
                  {audit.auditType}
                </Text>
              </div>
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
        <div className="mb-8 rounded-2xl border border-[#C4B8F3]">
          <div className="mb-4 sm:mb-5 pl-2">
            <Text variant="headingMd" fontWeight="bold">
              Evaluation Summary
            </Text>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 md:gap-8">
            <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
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
                TOTAL TEST CASES
              </Text>
              <div>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="text-green-600 text-xl sm:text-2xl"
                >
                  {audit.totalTests || 0}
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

          {/* Module-wise Results - Sample Issues */}
          {modulesWithVisualizationData.length > 0 && (
            <div className="mt-8 pt-4">
              <div className="mb-4">
                <Text variant="headingMd" fontWeight="bold">
                  Module-wise Results
                </Text>
              </div>

              {/* Module Tabs - styled similar to NewEvaluationContent, only for modules with data */}
              <div className="mb-4 max-[1023px]:mb-3  bg-white border-solid border-1 border-baseGraySlateAlpha4 rounded-2 max-[640px]:mb-2">
                <Tabs defaultValue={modulesWithVisualizationData[0]}>
                  <TabList>
                    {modulesWithVisualizationData.map((moduleName, index) => {
                      return (
                        <Tab value={moduleName} key={index}>
                          {formatModuleName(moduleName)}
                        </Tab>
                      );
                    })}
                  </TabList>
                  {modulesWithVisualizationData.map((moduleName, index) => {
                    return (
                      <TabPanel key={index} value={moduleName}>
                        <div className="mt-5 m-5">
                          <SeverityBarChart
                            issues={apiModuleIssues.filter(
                              (issue) => issue.module === moduleName
                            )}
                            metricSummary={metricSummary[moduleName]}
                          />

                          <Text
                            variant="bodyLg"
                            fontWeight="bold"
                            className="mb-3 block text-gray-900"
                          >
                            Sample Issues
                          </Text>

                          <div className="flex flex-col gap-4">
                            {(() => {
                              const issuesForModule = apiModuleIssues.filter(
                                (issue) => issue.module === moduleName
                              );

                              if (issuesForModule.length === 0) {
                                return (
                                  <Text
                                    variant="bodySm"
                                    className="text-gray-600"
                                  >
                                    No issues found for this module.
                                  </Text>
                                );
                              }

                              return issuesForModule.map(
                                (issue, index: number) => {
                                  const isExpanded = expandedIssueIds.has(
                                    issue.id
                                  );
                                  const isFailed = issue.status === "FAILED";
                                  const tagColors =
                                    isFailed && issue.severity
                                      ? getSeverityTagColors(issue.severity)
                                      : {
                                          fillColor: "#BBF7D0",
                                          textColor: "#15803D",
                                        };

                                  return (
                                    <div
                                      key={issue.id}
                                      className="test-case-card-border bg-white p-6 mt-2"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleIssueCard(issue.id)
                                        }
                                        className="w-full flex items-center justify-between text-left mb-0 border-none outline-none bg-transparent"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Text
                                            variant="bodyLg"
                                            fontWeight="bold"
                                          >
                                            Issue {index + 1}
                                          </Text>
                                          <Tag
                                            variation="filled"
                                            fillColor={tagColors.fillColor}
                                            textColor={tagColors.textColor}
                                          >
                                            {isFailed &&
                                            issue.severity &&
                                            issue.issueType
                                              ? `${
                                                  issue.severity.charAt(0) +
                                                  issue.severity
                                                    .slice(1)
                                                    .toLowerCase()
                                                } risk - ${issue.issueType}`
                                              : issue.status}
                                          </Tag>
                                        </div>
                                        {isExpanded ? (
                                          <IconMinus
                                            className="text-gray-600"
                                            size={20}
                                          />
                                        ) : (
                                          <IconPlus
                                            className="text-gray-600"
                                            size={20}
                                          />
                                        )}
                                      </button>

                                      {isExpanded && (
                                        <div className="mt-5 space-y-4 ml-1">
                                          <div>
                                            <Text
                                              variant="bodyLg"
                                              fontWeight="semibold"
                                              className="mb-2 block"
                                            >
                                              Input
                                            </Text>
                                            <div className="prose prose-sm max-w-none ml-2 overflow-x-hidden break-words text-gray-900">
                                              <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                              >
                                                {issue.input || ""}
                                              </ReactMarkdown>
                                            </div>
                                          </div>

                                          <div>
                                            <Text
                                              variant="bodyLg"
                                              fontWeight="semibold"
                                              className="mb-2 block"
                                            >
                                              Output
                                            </Text>
                                            <div className="prose prose-sm max-w-none overflow-x-hidden ml-2 break-words text-gray-900">
                                              <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                              >
                                                {issue.output || ""}
                                              </ReactMarkdown>
                                            </div>
                                          </div>

                                          {issue.comments && (
                                            <div>
                                              <Text
                                                variant="bodyLg"
                                                fontWeight="semibold"
                                                className="mb-2 block"
                                              >
                                                Comments
                                              </Text>
                                              <div className="prose prose-sm max-w-none ml-2 overflow-x-hidden break-words text-gray-900">
                                                <ReactMarkdown
                                                  remarkPlugins={[remarkGfm]}
                                                >
                                                  {issue.comments}
                                                </ReactMarkdown>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              );
                            })()}
                          </div>
                        </div>
                      </TabPanel>
                    );
                  })}
                </Tabs>
              </div>

              {/* Sample Issues List */}
            </div>
          )}
        </div>
      )}

      {/* Test Cases table removed in favour of module-wise samples */}

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-4 pt-8">
        <Button
          kind="secondary"
          disabled={!isReportReady || isDownloading}
          icon={
            <Icon
              source={IconDownload}
              size={18}
              className={isReportReady ? "text-white" : "text-black"}
            />
          }
          onClick={downloadReport}
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
