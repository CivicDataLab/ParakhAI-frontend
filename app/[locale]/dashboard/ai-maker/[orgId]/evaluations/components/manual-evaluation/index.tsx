"use client";

import { useGraphQL } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import { useParams, useRouter } from "next/navigation";
import { Button, Select, Spinner, Text, TextField } from "opub-ui";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { SelectOption } from "../types";
import EvaluateOutputSection, {
  createEvaluationIssueRow,
  type EvaluationIssueRow,
} from "./EvaluateOutputSection";
import {
  clearManualEvalWorkspaceDraft,
  MIN_PLAYGROUND_TEST_CASES,
  readManualEvalWorkspaceDraft,
  writeManualEvalWorkspaceDraft,
} from "./utils";
import CompletedTestCases from "./CompletedTestCases";
import RecommendationModal from "./RecommendationModal";
import {
  FINISH_EVALUATION_MUTATION,
  GET_PLAYGROUND_STATUS_QUERY,
  GET_TEST_CASES_QUERY,
  METRICS_BY_MODEL_TYPE_QUERY,
  SUBMIT_TEST_CASE_MUTATION,
  GENERATE_PLAYGROUND_REASON_MUTATION,
} from "./queries";
import {
  LANGUAGE_OPTIONS,
  type ManualTestCase,
  type SubModuleInfo,
} from "./types";
import remarkGfm from "remark-gfm";

const CALL_MODEL_MUTATION = `
  mutation CallModelForManualEval($input: CallModelInput!) {
    callModelForManualEval(input: $input) {
      success
      message
      output
      latencyMs
    }
  }
`;

interface ManualEvaluationFlowProps {
  auditId: string;
  modules: string[];
  moduleMetrics?: Record<string, SelectOption[]>;
  modelType: string;
  domain?: string;
  supportedLanguages?: string[];
  orgId: string;
  onFinishAudit: () => void;
  isRequestingAudit: boolean;
  onTestCaseCountChange?: (count: number) => void;
}

const ManualEvaluationFlow: React.FC<ManualEvaluationFlowProps> = ({
  auditId,
  modelType,
  domain,
  supportedLanguages,
  orgId,
  onTestCaseCountChange,
}) => {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";
  const { request } = useGraphQL();

  // Issue type options fetched from metricsByModelType
  const [issueTypeOptions, setIssueTypeOptions] = useState<SubModuleInfo[]>([]);

  // Playground evaluation status
  const [testCaseCount, setTestCaseCount] = useState(0);
  const [canFinish, setCanFinish] = useState(false);

  const [testCases, setTestCases] = useState<ManualTestCase[]>([]);

  // Test case input state
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [inputPrompt, setInputPrompt] = useState("");

  // Model output state
  const [modelOutput, setModelOutput] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | undefined>();
  const [hasCalledModel, setHasCalledModel] = useState(false);

  // Evaluation state
  const [status, setStatus] = useState<"PASSED" | "FAILED" | null>(null);
  const [issueRows, setIssueRows] = useState<EvaluationIssueRow[]>([]);

  // Promise chain for background "Add Issue" saves. Each click appends to the chain
  // so saves are sequential and the testCase.id from the first save flows forward.
  const addIssueChainRef = useRef<Promise<string | null>>(Promise.resolve(null));

  // Loading states
  const [isCallingModel, setIsCallingModel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishingEvaluation, setIsFinishingEvaluation] = useState(false);
  const [showFinishRecommendationModal, setShowFinishRecommendationModal] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelCallError, setModelCallError] = useState<string | null>(null);

  const hasRestoredWorkspaceRef = useRef(false);
  const persistWorkspaceTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  // const metricsLoadedRef = useRef(false);
  // Tracks the auditId we've already loaded initial data for to prevent duplicate
  // fetches when useCallback deps like `request` change after auth stabilises.
  const loadedForAuditIdRef = useRef<string | null>(null);

  const fetchEvaluationStatus = useCallback(async () => {
    try {
      const result = await request<{
        playgroundEvaluationStatus: {
          auditId: string;
          testCaseCount: number;
          canFinish: boolean;
        };
      }>(GET_PLAYGROUND_STATUS_QUERY, { auditId }, { organization: orgId });

      if (result?.playgroundEvaluationStatus) {
        setTestCaseCount(result.playgroundEvaluationStatus.testCaseCount);
        setCanFinish(result.playgroundEvaluationStatus.canFinish);
      }
    } catch (err) {
      console.error("Error fetching evaluation status:", err);
    }
  }, [auditId, orgId, request]);

  const fetchMetrics = useCallback(async () => {
    if (!modelType) return;
    try {
      const result = await request<{
        metricsByModelType: Array<{
          name: string;
          displayName: string;
          metrics: Array<{ name: string; displayName: string }>;
        }>;
      }>(METRICS_BY_MODEL_TYPE_QUERY, { modelType, domain: domain ?? "" }, { organization: orgId });

      const modules = result?.metricsByModelType ?? [];
      const allMetrics = modules.flatMap((m) => m.metrics ?? []);
      setIssueTypeOptions(
        allMetrics.map((m) => ({
          name: m.name,
          displayName: m.displayName || m.name,
        }))
      );
    } catch (err) {
      console.error("Error fetching metrics:", err);
    }
  }, [modelType, orgId, request]);

  const fetchTestCases = useCallback(async () => {
    try {
      const result = await request<{
        manualTestCases: ManualTestCase[];
      }>(GET_TEST_CASES_QUERY, { auditId, module: null }, { organization: orgId });

      if (result?.manualTestCases) {
        setTestCases(result.manualTestCases);
      }
    } catch (err) {
      console.error("Error fetching test cases:", err);
    }
  }, [auditId, orgId, request]);

  // Initial load — guarded by ref so it only fires once per auditId even if
  // fetchEvaluationStatus/fetchTestCases change reference (e.g. after token refresh).
  useEffect(() => {
    if (loadedForAuditIdRef.current === auditId) return;
    loadedForAuditIdRef.current = auditId;

    const loadInitialData = async () => {
      setIsLoading(true);
      await Promise.all([fetchEvaluationStatus(), fetchTestCases(), fetchMetrics()]);
      setIsLoading(false);
    };
    loadInitialData();
  }, [auditId, fetchEvaluationStatus, fetchTestCases, fetchMetrics]);

  // Lazy-load metrics only once model output is received — only needed for the issue type dropdown
  // useEffect(() => {
  //   if (hasCalledModel && !metricsLoadedRef.current && modelType) {
  //     metricsLoadedRef.current = true;
  //     void fetchMetrics();
  //   }
  // }, [hasCalledModel, fetchMetrics, modelType]);

  useEffect(() => {
    onTestCaseCountChange?.(testCases.length);
  }, [testCases.length, onTestCaseCountChange]);

  useEffect(() => {
    hasRestoredWorkspaceRef.current = false;
  }, [auditId]);

  // Restore workspace draft after initial load
  useEffect(() => {
    if (!auditId || isLoading || hasRestoredWorkspaceRef.current) return;

    hasRestoredWorkspaceRef.current = true;
    const draft = readManualEvalWorkspaceDraft(orgId, auditId);
    if (!draft) return;

    setSourceLanguage(draft.sourceLanguage || "en");
    setTargetLanguage(draft.targetLanguage || "");
    setInputPrompt(draft.inputPrompt || "");
    setModelOutput(draft.modelOutput || "");
    setLatencyMs(draft.latencyMs);
    setHasCalledModel(draft.hasCalledModel);
    setStatus(draft.status);
    if (draft.status === "FAILED" && draft.issueRows.length > 0) {
      setIssueRows(draft.issueRows);
    }
  }, [auditId, isLoading, orgId]);

  // Persist workspace draft on change (debounced)
  useEffect(() => {
    if (!auditId || !hasRestoredWorkspaceRef.current) return;

    if (persistWorkspaceTimeoutRef.current) {
      clearTimeout(persistWorkspaceTimeoutRef.current);
    }

    persistWorkspaceTimeoutRef.current = setTimeout(() => {
      writeManualEvalWorkspaceDraft(orgId, auditId, {
        selectedModule: null,
        sourceLanguage,
        targetLanguage,
        inputPrompt,
        modelOutput,
        latencyMs,
        hasCalledModel,
        status,
        issueRows,
      });
    }, 300);

    return () => {
      if (persistWorkspaceTimeoutRef.current) {
        clearTimeout(persistWorkspaceTimeoutRef.current);
      }
    };
  }, [
    auditId,
    orgId,
    sourceLanguage,
    targetLanguage,
    inputPrompt,
    modelOutput,
    latencyMs,
    hasCalledModel,
    status,
    issueRows,
  ]);

  useEffect(() => {
    if (status === "FAILED" && issueRows.length === 0) {
      setIssueRows([createEvaluationIssueRow()]);
    }
    if (status !== "FAILED") {
      setIssueRows([]);
    }
  }, [status, issueRows.length]);

  const handleCallModel = async () => {
    if (!inputPrompt.trim() || !auditId) return;

    setIsCallingModel(true);
    setError(null);
    setModelCallError(null);

    try {
      const result = await request<{
        callModelForManualEval: {
          success: boolean;
          message: string;
          output?: string;
          latencyMs?: number;
        };
      }>(
        CALL_MODEL_MUTATION,
        {
          input: {
            auditId,
            inputPrompt: inputPrompt.trim(),
            sourceLanguage: sourceLanguage || null,
            targetLanguage: targetLanguage || null,
          },
        },
        { organization: orgId }
      );

      const modelResponse = result?.callModelForManualEval;

      if (modelResponse?.success) {
        setModelCallError(null);
        setModelOutput(modelResponse.output || "");
        setLatencyMs(modelResponse.latencyMs);
        setHasCalledModel(true);
      } else if (!modelResponse?.output?.trim()) {
        const errorLog =
          modelResponse?.message?.trim() || "Unknown error occurred.";
        setModelCallError(
          `No output was returned by the model. This may be caused by a temporary connectivity issue, server outage, or model unavailability. See error details below:\n${errorLog}`
        );
        setModelOutput("");
        setLatencyMs(undefined);
        setHasCalledModel(false);
        setStatus(null);
      }
    } catch (err: any) {
      setError(err.message || "Error calling model");
    } finally {
      setIsCallingModel(false);
    }
  };

  const handleGenerateReason = async (rowId: string, issueType: string, severity: string) => {
    if (!issueType || !severity) {
      setError("Please select an Issue and Risk Severity first.");
      return;
    }

    setError(null);
    try {
      const result = await request<{
        generatePlaygroundReason: {
          success: boolean;
          message: string;
          reason: string;
        };
      }>(
        GENERATE_PLAYGROUND_REASON_MUTATION,
        {
          input: {
            auditId,
            metricName: issueType,
            severity,
            inputPrompt: inputPrompt.trim(),
            modelOutput,
          },
        },
        { organization: orgId }
      );

      if (result?.generatePlaygroundReason?.success) {
        // Update the specific row's observations with the generated reason
        setIssueRows((prev) =>
          prev.map((row) =>
            row.id === rowId
              ? { ...row, observations: result.generatePlaygroundReason.reason }
              : row
          )
        );
      } else {
        setError(result?.generatePlaygroundReason?.message || "Failed to generate reason");
      }
    } catch (err: any) {
      setError(err.message || "Error generating reason");
    }
  };

  // Opens a new empty issue box immediately and saves the current (last) row in the
  // background. No loading state is shown. The promise chain ensures saves are
  // sequential and the testCase.id from the first save flows into subsequent ones.
  const handleAddIssue = () => {
    const lastRow = issueRows[issueRows.length - 1];
    if (!lastRow?.issueType || !lastRow?.severity || !lastRow?.observations.trim()) {
      setError("Please complete issue type, risk severity, and reasons");
      return;
    }

    setError(null);

    // Capture mutable closure values before the state update
    const savedRow = lastRow;
    const savedInputPrompt = inputPrompt.trim();
    const savedModelOutput = modelOutput;
    const savedSourceLanguage = sourceLanguage || null;
    const savedTargetLanguage = targetLanguage || null;

    // Immediately show the next issue box — no loading
    setIssueRows((prev) => [...prev, createEvaluationIssueRow()]);

    // Chain onto the ref so background saves are sequential
    addIssueChainRef.current = addIssueChainRef.current.then(
      async (existingTestId) => {
        const input: Record<string, unknown> = {
          auditId,
          status: "FAILED",
          issueType: savedRow.issueType,
          severity: savedRow.severity,
          comments: savedRow.observations || null,
          idealOutput: savedRow.idealOutput || null,
        };

        if (existingTestId) {
          input.testId = parseInt(existingTestId, 10);
        } else {
          input.inputPrompt = savedInputPrompt;
          input.modelOutput = savedModelOutput;
          input.sourceLanguage = savedSourceLanguage;
          input.targetLanguage = savedTargetLanguage;
        }

        try {
          const result = await request<{
            submitManualTestCase: {
              success: boolean;
              testCase?: { id: string };
            };
          }>(SUBMIT_TEST_CASE_MUTATION, { input }, { organization: orgId });

          if (result?.submitManualTestCase?.success) {
            // Preserve the first testCase.id for all subsequent issues
            return existingTestId ?? result.submitManualTestCase.testCase?.id ?? null;
          }
        } catch (err) {
          console.error("Background issue save failed:", err);
        }
        return existingTestId;
      }
    );
  };

  // Saves the final (or only) issue and resets the form. Awaits the background
  // chain first so the correct testId is used.
  const handleSubmitTestCase = async () => {
    if (!status) return;

    const lastRow = issueRows[issueRows.length - 1];

    if (
      status === "FAILED" &&
      (!lastRow?.issueType || !lastRow?.severity || !lastRow?.observations.trim())
    ) {
      setError(
        "Please complete issue, risk severity, and reasons for failed test cases"
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (status === "PASSED") {
        await request<{
          submitManualTestCase: { success: boolean; message: string };
        }>(
          SUBMIT_TEST_CASE_MUTATION,
          {
            input: {
              auditId,
              inputPrompt: inputPrompt.trim(),
              modelOutput,
              sourceLanguage: sourceLanguage || null,
              targetLanguage: targetLanguage || null,
              status: "PASSED",
            },
          },
          { organization: orgId }
        );
      } else {
        // Await any in-flight background saves to get the resolved testId
        const resolvedTestId = await addIssueChainRef.current;

        const input: Record<string, unknown> = {
          auditId,
          status: "FAILED",
          issueType: lastRow.issueType,
          severity: lastRow.severity,
          comments: lastRow.observations || null,
          idealOutput: lastRow.idealOutput || null,
        };

        if (resolvedTestId) {
          input.testId = parseInt(resolvedTestId, 10);
        } else {
          input.inputPrompt = inputPrompt.trim();
          input.modelOutput = modelOutput;
          input.sourceLanguage = sourceLanguage || null;
          input.targetLanguage = targetLanguage || null;
        }

        const result = await request<{
          submitManualTestCase: { success: boolean; message: string };
        }>(SUBMIT_TEST_CASE_MUTATION, { input }, { organization: orgId });

        if (!result?.submitManualTestCase?.success) {
          setError(
            result?.submitManualTestCase?.message || "Failed to submit test case"
          );
          return;
        }
      }

      await Promise.all([fetchEvaluationStatus(), fetchTestCases()]);
      resetTestCaseForm();
    } catch (err: any) {
      setError(err.message || "Error submitting test case");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishEvaluation = async (recommendation: string) => {
    if (!canFinish) {
      setError(
        `Evaluate at least ${MIN_PLAYGROUND_TEST_CASES} test cases to finish the evaluation.`
      );
      return;
    }

    setIsFinishingEvaluation(true);
    setError(null);

    try {
      const result = await request<{
        finishManualEvaluation: {
          success: boolean;
          message: string;
          auditId?: number;
        };
      }>(
        FINISH_EVALUATION_MUTATION,
        {
          input: {
            auditId,
            recommendation: recommendation.trim() || null,
          },
        },
        { organization: orgId }
      );

      if (result?.finishManualEvaluation?.success) {
        clearManualEvalWorkspaceDraft(orgId, auditId);
        setShowFinishRecommendationModal(false);
        router.push(
          `/${locale}/dashboard/ai-maker/${orgId}/evaluations/${auditId}`
        );
      } else {
        setError(
          result?.finishManualEvaluation?.message || "Failed to finish evaluation"
        );
      }
    } catch (err: any) {
      setError(err.message || "Error finishing evaluation");
    } finally {
      setIsFinishingEvaluation(false);
    }
  };

  const resetTestCaseForm = () => {
    setInputPrompt("");
    setModelOutput("");
    setLatencyMs(undefined);
    setHasCalledModel(false);
    setStatus(null);
    setIssueRows([]);
    setModelCallError(null);
    addIssueChainRef.current = Promise.resolve(null);
    writeManualEvalWorkspaceDraft(orgId, auditId, {
      selectedModule: null,
      sourceLanguage,
      targetLanguage,
      inputPrompt: "",
      modelOutput: "",
      hasCalledModel: false,
      status: null,
      issueRows: [],
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <Text variant="bodyMd" className="ml-3">
          Loading evaluation...
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <Text variant="bodySm" className="text-red-700">
            {error}
          </Text>
        </div>
      )}

      <div className="space-y-6">
        {supportedLanguages && supportedLanguages.length > 1 && (
          <div className="flex items-center justify-between mb-0">
            <div className="flex gap-4">
              <div className="w-48">
                <Select
                  name="sourceLanguage"
                  label="Source Language"
                  labelHidden
                  options={LANGUAGE_OPTIONS.filter((opt) =>
                    supportedLanguages.includes(opt.value)
                  )}
                  value={sourceLanguage}
                  onChange={setSourceLanguage}
                  placeholder="Select"
                />
              </div>
              <div className="w-48">
                <Select
                  name="targetLanguage"
                  label="Target Language"
                  labelHidden
                  options={LANGUAGE_OPTIONS.filter((opt) =>
                    supportedLanguages.includes(opt.value)
                  )}
                  value={targetLanguage}
                  onChange={setTargetLanguage}
                  placeholder="Select"
                />
              </div>
            </div>
          </div>
        )}

        {/* Input and Output Panels Side by Side */}
        <div className="grid grid-cols-1 gap-6 !-mt-2 lg:grid-cols-2">
          <div className="manual-eval-input-panel bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <Text variant="bodyMd" fontWeight="medium">
                Input
              </Text>
            </div>
            <TextField
              name="inputPrompt"
              label="Input Prompt"
              labelHidden
              multiline={12}
              value={inputPrompt}
              onChange={setInputPrompt}
              placeholder="Type your prompt here"
              disabled={isCallingModel}
            />
            {modelCallError && (
              <Text
                variant="bodySm"
                color="critical"
                className="mt-3 block whitespace-pre-wrap"
              >
                {modelCallError}
              </Text>
            )}
            <div className="mt-4 flex justify-end">
              <Button
                kind="primary"
                onClick={handleCallModel}
                disabled={!inputPrompt.trim() || isCallingModel}
                className="rounded-[6px] bg-primaryPurple2 px-6 py-2 text-base font-bold text-white hover:bg-[#6849EE] hover:!bg-[#6849EE] hover:text-white hover:!text-white disabled:text-gray-400"
              >
                {isCallingModel ? "Please Wait..." : "Submit"}
              </Button>
            </div>
          </div>

          <div className="manual-eval-input-panel relative bg-white p-6 pb-16">
            <div className="mb-2 flex items-center justify-between">
              <Text variant="bodyMd" fontWeight="medium">
                Output
              </Text>
              {latencyMs ? (
                <span className="rounded-[3px] border bg-baseIndigoSolid4 px-2 text-[14px] text-gray-600">
                  {(latencyMs / 1000).toFixed(0)} sec
                </span>
              ) : null}
            </div>
            <div className="mb-4 min-h-[200px] max-h-[300px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 px-4 py-0">
              <div className="bulk-evaluation-sheet-prose -ml-4">
                {isCallingModel ? (
                  <Text variant="bodyMd" className="text-gray-500">
                    Generating ....
                  </Text>
                ) : hasCalledModel ? (
                  modelOutput ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {modelOutput || ""}
                    </ReactMarkdown>
                  ) : (
                    <Text variant="bodyMd">No output received</Text>
                  )
                ) : (
                  <Text variant="bodyMd" className="text-gray-500">
                    Output will appear here after submitting the prompt
                  </Text>
                )}
              </div>
            </div>
            {hasCalledModel && (
              <div className="absolute bottom-6 right-6 flex justify-end gap-3">
                <Button
                  kind="secondary"
                  onClick={() => setStatus("PASSED")}
                  className={`rounded-[6px] ${status === "PASSED" ? "bg-[#26007b] text-white hover:bg-[#4003c4] hover:text-white" : ""}`}
                >
                  ✓ Passed
                </Button>
                <Button
                  kind="secondary"
                  onClick={() => setStatus("FAILED")}
                  className={`rounded-[6px] ${status === "FAILED" ? "bg-[#26007b] text-white hover:bg-[#4003c4] hover:text-white" : ""}`}
                >
                  ✕ Failed
                </Button>
              </div>
            )}
          </div>
        </div>

        {hasCalledModel && status === "FAILED" && (
          <EvaluateOutputSection
            issueRows={issueRows}
            subModules={issueTypeOptions}
            onIssueRowsChange={setIssueRows}
            onAddIssue={handleAddIssue}
            onSave={handleSubmitTestCase}
            onGenerateReason={handleGenerateReason}
            isSaving={isSubmitting}
            saveDisabled={
              !issueRows[issueRows.length - 1]?.issueType ||
              !issueRows[issueRows.length - 1]?.severity ||
              !issueRows[issueRows.length - 1]?.observations.trim()
            }
          />
        )}

        {hasCalledModel && status === "PASSED" && (
          <div className="flex justify-center pt-2">
            <Button
              kind="secondary"
              onClick={handleSubmitTestCase}
              disabled={isSubmitting}
              className="rounded-[6px] bg-[#26007b] text-white hover:bg-[#4003c4] hover:text-white disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save and Test New Input"}
            </Button>
          </div>
        )}

        <CompletedTestCases
          testCases={testCases}
          modules={[]}
          subModules={issueTypeOptions}
          getModuleDisplayName={(name) => name}
        />
      </div>

      {!canFinish && testCaseCount < MIN_PLAYGROUND_TEST_CASES && (
        <Text
          variant="bodyMd"
          fontWeight="medium"
          className="pt-4 text-center text-[#2d2c2a]"
        >
          Note: Evaluate at least {MIN_PLAYGROUND_TEST_CASES} test cases to
          finish the evaluation.
        </Text>
      )}

      <div className="flex items-center justify-center gap-6 pt-8 border-t border-gray-200">
        <Button
          kind="primary"
          onClick={() => setShowFinishRecommendationModal(true)}
          disabled={isFinishingEvaluation || !canFinish}
          className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold text-base"
        >
          {isFinishingEvaluation ? "Finishing..." : "Finish Evaluation"}
        </Button>
      </div>

      <RecommendationModal
        open={showFinishRecommendationModal}
        onOpenChange={setShowFinishRecommendationModal}
        title="Evaluation Recommendation"
        description="Enter your recommendation for this evaluation."
        placeholder="Enter your recommendation for this evaluation"
        onSubmit={(recommendation) => {
          void handleFinishEvaluation(recommendation);
        }}
        isSubmitting={isFinishingEvaluation}
        submitButtonText="Finish Evaluation"
      />
    </div>
  );
};

export default ManualEvaluationFlow;
