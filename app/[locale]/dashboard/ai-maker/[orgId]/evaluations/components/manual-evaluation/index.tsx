"use client";

import { useGraphQL } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Select,
  Spinner,
  Text,
  TextField,
} from "opub-ui";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toTitleCase } from "@/lib/utils";
import type { SelectOption } from "../types";
import EvaluateOutputSection, {
  createEvaluationIssueRow,
  type EvaluationIssueRow,
} from "./EvaluateOutputSection";
import {
  clearManualEvalWorkspaceDraft,
  getFallbackSubModules,
  getTotalManualTestCaseCount,
  metricsToSubModules,
  MIN_PLAYGROUND_TEST_CASES,
  readManualEvalWorkspaceDraft,
  writeManualEvalWorkspaceDraft,
} from "./utils";
// import ModuleSelector from "./ModuleSelector";
import RecommendationModal from "./RecommendationModal";
import CompletedTestCases from "./CompletedTestCases";
import { GET_EVALUATION_STATUS_QUERY, GET_TEST_CASES_QUERY } from "./queries";
import {
  LANGUAGE_OPTIONS,
  type ManualEvaluationStatus,
  type ManualTestCase,
  type ModuleProgress,
  type SubModuleInfo,
} from "./types";
import remarkGfm from "remark-gfm";

// GraphQL Queries and Mutations
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

const SUBMIT_TEST_CASE_MUTATION = `
  mutation SubmitManualTestCase($input: SubmitManualTestCaseInput!) {
    submitManualTestCase(input: $input) {
      success
      message
      testCase {
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
      moduleProgress {
        testCaseCount
        isComplete
      }
    }
  }
`;

const COMPLETE_MODULE_MUTATION = `
  mutation CompleteModuleEvaluation($input: CompleteModuleEvaluationInput!) {
    completeModuleEvaluation(input: $input) {
      success
      message
      canFinishEvaluation
    }
  }
`;
// Complete module flow is temporarily disabled in favor of finishing evaluation directly.

const FINISH_EVALUATION_MUTATION = `
  mutation FinishManualEvaluation($input: FinishManualEvaluationInput!) {
    finishManualEvaluation(input: $input) {
      success
      message
      auditId
    }
  }
`;

const GET_SUB_MODULES_QUERY = `
  query ModuleSubModules($moduleName: String!, $modelType: String!) {
    moduleSubModules(moduleName: $moduleName, modelType: $modelType) {
      module
      moduleDisplayName
      subModules {
        name
        displayName
        description
      }
    }
  }
`;

interface ManualEvaluationFlowProps {
  auditId: string;
  modules: string[];
  moduleMetrics?: Record<string, SelectOption[]>;
  modelType: string;
  supportedLanguages?: string[];
  orgId: string;
  onFinishAudit: () => void;
  isRequestingAudit: boolean;
  onTestCaseCountChange?: (count: number) => void;
}

const ManualEvaluationFlow: React.FC<ManualEvaluationFlowProps> = ({
  auditId,
  modules,
  moduleMetrics,
  modelType,
  supportedLanguages,
  orgId,
  onFinishAudit,
  isRequestingAudit,
  onTestCaseCountChange,
}) => {
  // Router and params for navigation
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";

  // GraphQL hook for authenticated requests
  const { request } = useGraphQL();

  // State
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
  const [subModules, setSubModules] = useState<SubModuleInfo[]>([]);
  const [testCases, setTestCases] = useState<ManualTestCase[]>([]);
  const [canFinishEvaluation, setCanFinishEvaluation] = useState(false);

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

  // Modal state for recommendations
  const [showModuleRecommendationModal, setShowModuleRecommendationModal] =
    useState(false);
  // const [showOverallRecommendationModal, setShowOverallRecommendationModal] =
  //   useState(false);

  // Loading states
  const [isCallingModel, setIsCallingModel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [isCompletingModule, setIsCompletingModule] = useState(false);
  const [isFinishingEvaluation, setIsFinishingEvaluation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasRestoredWorkspaceRef = useRef(false);
  const persistWorkspaceTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const issueSubModules = useMemo(() => {
    if (!selectedModule) return subModules;

    const configuredMetrics = moduleMetrics?.[selectedModule];
    if (configuredMetrics?.length) {
      return metricsToSubModules(configuredMetrics);
    }

    if (subModules.length > 0) return subModules;

    return getFallbackSubModules(selectedModule);
  }, [selectedModule, moduleMetrics, subModules]);

  const getModuleDisplayName = useCallback(
    (name: string) => {
      // Prefer backend-provided displayName from manualEvaluationStatus
      const progressEntry = moduleProgress.find((p) => p.module === name);
      if (progressEntry?.moduleDisplayName) {
        return progressEntry.moduleDisplayName;
      }

      // Fallback to a readable version of the enum-like name
      return toTitleCase(name.replace(/_/g, " "));
    },
    [moduleProgress]
  );

  // Fetch evaluation status
  const pickActiveModule = useCallback(
    (progress: ModuleProgress[]) => {
      const nextIncomplete = modules.find((module) => {
        const entry = progress.find((p) => p.module === module);
        return !entry?.isComplete;
      });
      return nextIncomplete ?? modules[0] ?? null;
    },
    [modules]
  );

  const fetchEvaluationStatus = useCallback(async () => {
    try {
      const result = await request<{
        manualEvaluationStatus: ManualEvaluationStatus;
      }>(GET_EVALUATION_STATUS_QUERY, { auditId }, { organization: orgId });

      if (result?.manualEvaluationStatus) {
        setModuleProgress(result.manualEvaluationStatus.moduleProgress);
        setCanFinishEvaluation(
          result.manualEvaluationStatus.canFinishEvaluation
        );
        return result.manualEvaluationStatus;
      }
    } catch (err) {
      console.error("Error fetching evaluation status:", err);
    }
    return null;
  }, [auditId, orgId, request]);

  // Fetch sub-modules for selected module
  const fetchSubModules = useCallback(
    async (moduleName: string) => {
      try {
        const result = await request<{
          moduleSubModules: {
            subModules: SubModuleInfo[];
          };
        }>(
          GET_SUB_MODULES_QUERY,
          { moduleName, modelType },
          { organization: orgId }
        );

        const apiSubModules = result?.moduleSubModules?.subModules;
        if (apiSubModules?.length) {
          setSubModules(apiSubModules);
        } else {
          setSubModules(getFallbackSubModules(moduleName));
        }
      } catch (err) {
        console.error("Error fetching sub-modules:", err);
        setSubModules(getFallbackSubModules(moduleName));
      }
    },
    [modelType, orgId, request]
  );

  // Fetch test cases
  const fetchTestCases = useCallback(async () => {
    try {
      const result = await request<{
        manualTestCases: ManualTestCase[];
      }>(GET_TEST_CASES_QUERY, { auditId }, { organization: orgId });

      if (result?.manualTestCases) {
        setTestCases(result.manualTestCases);
      }
    } catch (err) {
      console.error("Error fetching test cases:", err);
    }
  }, [auditId, orgId, request]);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await Promise.all([fetchEvaluationStatus(), fetchTestCases()]);
      setIsLoading(false);
    };
    loadInitialData();
  }, [fetchEvaluationStatus, fetchTestCases]);

  useEffect(() => {
    onTestCaseCountChange?.(testCases.length);
  }, [testCases.length, onTestCaseCountChange]);

  // Load sub-modules when module is selected
  useEffect(() => {
    if (selectedModule) {
      fetchSubModules(selectedModule);
    }
  }, [selectedModule, fetchSubModules]);

  useEffect(() => {
    if (modules.length === 0) {
      setSelectedModule(null);
      return;
    }
    if (!selectedModule || !modules.includes(selectedModule)) {
      setSelectedModule(modules[0]);
    }
  }, [modules, selectedModule]);

  useEffect(() => {
    hasRestoredWorkspaceRef.current = false;
  }, [auditId]);

  useEffect(() => {
    if (!auditId || isLoading || hasRestoredWorkspaceRef.current) return;
    if (modules.length === 0) return;

    hasRestoredWorkspaceRef.current = true;
    const draft = readManualEvalWorkspaceDraft(orgId, auditId);
    if (!draft) return;

    if (draft.selectedModule && modules.includes(draft.selectedModule)) {
      setSelectedModule(draft.selectedModule);
    }
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
  }, [auditId, isLoading, modules, orgId]);

  useEffect(() => {
    if (!auditId || !hasRestoredWorkspaceRef.current) return;

    if (persistWorkspaceTimeoutRef.current) {
      clearTimeout(persistWorkspaceTimeoutRef.current);
    }

    persistWorkspaceTimeoutRef.current = setTimeout(() => {
      writeManualEvalWorkspaceDraft(orgId, auditId, {
        selectedModule,
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
    selectedModule,
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

  // Call model
  const handleCallModel = async () => {
    if (!inputPrompt.trim() || !auditId) return;

    setIsCallingModel(true);
    setError(null);

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

      if (result?.callModelForManualEval?.success) {
        setModelOutput(result.callModelForManualEval.output || "");
        setLatencyMs(result.callModelForManualEval.latencyMs);
        setHasCalledModel(true);
      } else {
        setError(
          result?.callModelForManualEval?.message || "Failed to call model"
        );
      }
    } catch (err: any) {
      setError(err.message || "Error calling model");
    } finally {
      setIsCallingModel(false);
    }
  };

  // Submit test case
  const handleSubmitTestCase = async () => {
    if (!selectedModule || !status) return;

    const primaryIssue = issueRows[0];

    if (
      status === "FAILED" &&
      (!primaryIssue?.issueType ||
        !primaryIssue?.severity ||
        !primaryIssue?.observations.trim())
    ) {
      setError(
        "Please complete issue, risk severity, and reasons for failed test cases"
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await request<{
        submitManualTestCase: {
          success: boolean;
          message: string;
          testCase?: ManualTestCase;
          moduleProgress?: {
            testCaseCount: number;
            isComplete: boolean;
            canComplete: boolean;
          };
        };
      }>(
        SUBMIT_TEST_CASE_MUTATION,
        {
          input: {
            auditId,
            module: selectedModule,
            subModule: primaryIssue?.issueType || null,
            sourceLanguage: sourceLanguage || null,
            targetLanguage: targetLanguage || null,
            inputPrompt: inputPrompt.trim(),
            modelOutput,
            status,
            issueType: status === "FAILED" ? primaryIssue?.issueType : null,
            severity: status === "FAILED" ? primaryIssue?.severity : null,
            comments:
              status === "FAILED" ? primaryIssue?.observations || null : null,
            idealOutput:
              status === "FAILED" ? primaryIssue?.idealOutput || null : null,
          },
        },
        { organization: orgId }
      );

      if (result?.submitManualTestCase?.success) {
        const updatedProgress = result.submitManualTestCase.moduleProgress;
        if (updatedProgress && selectedModule) {
          setModuleProgress((prev) =>
            prev.map((entry) =>
              entry.module === selectedModule
                ? {
                    ...entry,
                    testCaseCount: updatedProgress.testCaseCount,
                    isComplete: updatedProgress.isComplete,
                    canComplete: updatedProgress.canComplete,
                  }
                : entry
            )
          );
        }
        // Reset form for next test case
        resetTestCaseForm();
        // Refresh data
        await Promise.all([fetchEvaluationStatus(), fetchTestCases()]);
      } else {
        setError(
          result?.submitManualTestCase?.message || "Failed to submit test case"
        );
      }
    } catch (err: any) {
      setError(err.message || "Error submitting test case");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete module is temporarily disabled; finish evaluation opens the recommendation modal instead.
  // const handleCompleteModule = async (recommendation: string) => {
  //   if (!selectedModule) return;
  //
  //   const progress = moduleProgress.find((p) => p.module === selectedModule);
  //   if (!progress || progress.testCaseCount < 3) {
  //     setError("Module requires at least 3 test cases");
  //     return;
  //   }
  //
  //   setIsCompletingModule(true);
  //   setError(null);
  //
  //   try {
  //     const result = await request<{
  //       completeModuleEvaluation: {
  //         success: boolean;
  //         message: string;
  //         canFinishEvaluation: boolean;
  //       };
  //     }>(
  //       COMPLETE_MODULE_MUTATION,
  //       {
  //         input: {
  //           auditId,
  //           module: selectedModule,
  //           recommendation: recommendation || null,
  //         },
  //       },
  //       { organization: orgId }
  //     );
  //
  //     if (result?.completeModuleEvaluation?.success) {
  //       setCanFinishEvaluation(
  //         result.completeModuleEvaluation.canFinishEvaluation
  //       );
  //       setShowModuleRecommendationModal(false);
  //       const status = await fetchEvaluationStatus();
  //       setSelectedModule(
  //         pickActiveModule(status?.moduleProgress ?? moduleProgress)
  //       );
  //     } else {
  //       setError(
  //         result?.completeModuleEvaluation?.message ||
  //           "Failed to complete module"
  //       );
  //     }
  //   } catch (err: any) {
  //     setError(err.message || "Error completing module");
  //   } finally {
  //     setIsCompletingModule(false);
  //   }
  // };

  const handleFinishEvaluation = async (recommendation: string) => {
    const totalTestCases = Math.max(
      getTotalManualTestCaseCount(moduleProgress),
      testCases.length
    );

    if (totalTestCases < MIN_PLAYGROUND_TEST_CASES) {
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
        { input: { auditId, recommendation: recommendation || null } },
        { organization: orgId }
      );

      if (result?.finishManualEvaluation?.success) {
        clearManualEvalWorkspaceDraft(orgId, auditId);
        setShowModuleRecommendationModal(false);
        router.push(
          `/${locale}/dashboard/ai-maker/${orgId}/evaluations/${auditId}`
        );
      } else {
        setError(
          result?.finishManualEvaluation?.message ||
            "Failed to finish evaluation"
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
    writeManualEvalWorkspaceDraft(orgId, auditId, {
      selectedModule,
      sourceLanguage,
      targetLanguage,
      inputPrompt: "",
      modelOutput: "",
      hasCalledModel: false,
      status: null,
      issueRows: [],
    });
  };

  const currentModuleProgress = selectedModule
    ? moduleProgress.find((p) => p.module === selectedModule)
    : null;

  const totalTestCaseCount = Math.max(
    getTotalManualTestCaseCount(moduleProgress),
    testCases.length
  );

  const canFinishEvaluationByMinimum =
    totalTestCaseCount >= MIN_PLAYGROUND_TEST_CASES;

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
      {/* {selectedModule && (
        <div>
          <Text variant="headingLg" className="mb-1 block">
            Test Cases for Module: {getModuleDisplayName(selectedModule)}
          </Text>
          <button
            onClick={() => setSelectedModule(null)}
            className="text-[#6849EE] hover:underline mb-4 block border-none bg-transparent p-0"
          >
            <Text variant="bodyMd" className="text-[#6849EE]">
              &lt; Change Module
            </Text>
          </button>
        </div>
      )} */}

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <Text variant="bodySm" className="text-red-700">
            {error}
          </Text>
        </div>
      )}

      {/* Module selection is handled in Evaluation Workspace above */}
      {/* {!selectedModule && (
        <ModuleSelector
          modules={modules}
          moduleProgress={moduleProgress}
          selectedModule={selectedModule}
          onSelectModule={setSelectedModule}
          getModuleDisplayName={getModuleDisplayName}
        />
      )}
      {!canFinishEvaluationByMinimum && (
        <Text
          variant="bodyMd"
          fontWeight="medium"
          className="mt-4 text-center text-[#2d2c2a]"
        >
          Note: Evaluate at least {MIN_PLAYGROUND_TEST_CASES} test cases to
          finish the evaluation.
        </Text>
      )} */}
      {/* Test Case Flow */}
      {selectedModule && (
        <div className="space-y-6">
          {/* Test Case Number and Language Selectors */}
          <div className="flex items-center justify-between mb-0">
            {/* <div>
              <Tag variation="filled" fillColor="#E5E7EB" textColor="#374151">
                <Text variant="bodySm" fontWeight="medium">
                  Test Case: {(currentModuleProgress?.testCaseCount || 0) + 1}
                </Text>
              </Tag>
            </div> */}
            {supportedLanguages && supportedLanguages.length > 1 && (
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
            )}
          </div>
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
              />
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
                <div className="-ml-4">
                  {hasCalledModel ? (
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
              subModules={issueSubModules}
              onIssueRowsChange={setIssueRows}
              onSave={handleSubmitTestCase}
              isSaving={isSubmitting}
              saveDisabled={
                !issueRows[0]?.issueType ||
                !issueRows[0]?.severity ||
                !issueRows[0]?.observations.trim()
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

          {/* Complete Module is temporarily disabled; use Finish Evaluation instead. */}
          {/* {canCompleteCurrentModule && (
            <div className="flex justify-center mt-4">
              <Button
                kind="primary"
                onClick={() => setShowModuleRecommendationModal(true)}
                disabled={isCompletingModule}
                className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold text-base"
              >
                {isCompletingModule ? "Completing..." : "Complete Module"}
              </Button>
            </div>
          )} */}

          <CompletedTestCases
            testCases={testCases}
            modules={modules}
            subModules={subModules}
            getModuleDisplayName={getModuleDisplayName}
          />
        </div>
      )}

      {!canFinishEvaluationByMinimum && (
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
          onClick={() => setShowModuleRecommendationModal(true)}
          disabled={isFinishingEvaluation || !canFinishEvaluationByMinimum}
          className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold text-base"
        >
          {isFinishingEvaluation ? "Finishing..." : "Finish Evaluation"}
        </Button>
      </div>

      <RecommendationModal
        open={showModuleRecommendationModal}
        onOpenChange={setShowModuleRecommendationModal}
        title="Module Recommendation"
        description={`Enter your recommendation for the ${selectedModule ? getModuleDisplayName(selectedModule) : ""} module.`}
        placeholder="Enter your recommendation for this module (optional)"
        onSubmit={handleFinishEvaluation}
        isSubmitting={isFinishingEvaluation}
        submitButtonText="Finish Evaluation"
      />

      {/* Overall recommendation modal replaced by module recommendation + finish evaluation flow. */}
      {/* <RecommendationModal
        open={showOverallRecommendationModal}
        onOpenChange={setShowOverallRecommendationModal}
        title="Overall Recommendation"
        description="Enter your overall recommendation for this evaluation."
        placeholder="Enter your overall recommendation (optional)"
        onSubmit={handleFinishEvaluation}
        isSubmitting={isRequestingAudit}
        submitButtonText="Finish Evaluation"
      /> */}
    </div>
  );
};

export default ManualEvaluationFlow;
