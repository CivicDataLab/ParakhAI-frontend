'use client';

import { useGraphQL } from '@/lib/api';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Button, Spinner, Tag, Text } from 'opub-ui';
import React, { useCallback, useEffect, useState } from 'react';
import FailureDetails from './FailureDetails';
import ModelOutputDisplay from './ModelOutputDisplay';
import ModuleSelector from './ModuleSelector';
import TestCaseHistory from './TestCaseHistory';
import TestCaseInput from './TestCaseInput';
import type {
  ManualEvaluationStatus,
  ManualTestCase,
  ModuleProgress,
  SubModuleInfo,
} from './types';

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

const FINISH_EVALUATION_MUTATION = `
  mutation FinishManualEvaluation($auditId: ID!) {
    finishManualEvaluation(auditId: $auditId) {
      success
      message
      auditId
    }
  }
`;

const GET_EVALUATION_STATUS_QUERY = `
  query ManualEvaluationStatus($auditId: ID!) {
    manualEvaluationStatus(auditId: $auditId) {
      auditId
      totalModules
      completedModules
      allModulesComplete
      canFinishEvaluation
      moduleProgress {
        module
        moduleDisplayName
        testCaseCount
        isComplete
        canComplete
        passedCount
        failedCount
      }
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

const GET_TEST_CASES_QUERY = `
  query ManualTestCases($auditId: ID!, $module: String) {
    manualTestCases(auditId: $auditId, module: $module) {
      id
      module
      subModule
      sourceLanguage
      targetLanguage
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

interface ManualEvaluationFlowProps {
  auditId: string;
  modules: string[];
  modelType: string;
  supportedLanguages?: string[];
  orgId: string;
  onPrevious: () => void;
  onFinishAudit: () => void;
  isRequestingAudit: boolean;
}

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  BIAS_FAIRNESS: 'Bias and Fairness',
  HALLUCINATION_MISINFORMATION: 'Hallucination and Misinformation',
  PRIVACY_SAFETY: 'Privacy and Safety',
};

const ManualEvaluationFlow: React.FC<ManualEvaluationFlowProps> = ({
  auditId,
  modules,
  modelType,
  supportedLanguages,
  orgId,
  onPrevious,
  onFinishAudit,
  isRequestingAudit,
}) => {
  // Router and params for navigation
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || 'en';

  // GraphQL hook for authenticated requests
  const { request } = useGraphQL();

  // State
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
  const [subModules, setSubModules] = useState<SubModuleInfo[]>([]);
  const [testCases, setTestCases] = useState<ManualTestCase[]>([]);
  const [canFinishEvaluation, setCanFinishEvaluation] = useState(false);

  // Test case input state
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [inputPrompt, setInputPrompt] = useState('');

  // Model output state
  const [modelOutput, setModelOutput] = useState('');
  const [latencyMs, setLatencyMs] = useState<number | undefined>();
  const [hasCalledModel, setHasCalledModel] = useState(false);

  // Evaluation state
  const [status, setStatus] = useState<'PASSED' | 'FAILED' | null>(null);
  const [issueType, setIssueType] = useState('');
  const [severity, setSeverity] = useState('');
  const [comments, setComments] = useState('');
  const [idealOutput, setIdealOutput] = useState('');

  // Loading states
  const [isCallingModel, setIsCallingModel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompletingModule, setIsCompletingModule] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getModuleDisplayName = useCallback((name: string) => {
    return MODULE_DISPLAY_NAMES[name] || name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

  // Fetch evaluation status
  const fetchEvaluationStatus = useCallback(async () => {
    try {
      const result = await request<{
        manualEvaluationStatus: ManualEvaluationStatus;
      }>(GET_EVALUATION_STATUS_QUERY, { auditId }, { organization: orgId });

      if (result?.manualEvaluationStatus) {
        setModuleProgress(result.manualEvaluationStatus.moduleProgress);
        setCanFinishEvaluation(result.manualEvaluationStatus.canFinishEvaluation);
      }
    } catch (err) {
      console.error('Error fetching evaluation status:', err);
    }
  }, [auditId, orgId, request]);

  // Fetch sub-modules for selected module
  const fetchSubModules = useCallback(async (moduleName: string) => {
    try {
      const result = await request<{
        moduleSubModules: {
          subModules: SubModuleInfo[];
        };
      }>(GET_SUB_MODULES_QUERY, { moduleName, modelType }, { organization: orgId });

      if (result?.moduleSubModules?.subModules) {
        setSubModules(result.moduleSubModules.subModules);
      }
    } catch (err) {
      console.error('Error fetching sub-modules:', err);
      // Use fallback sub-modules
      setSubModules(getFallbackSubModules(moduleName));
    }
  }, [modelType, orgId, request]);

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
      console.error('Error fetching test cases:', err);
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

  // Load sub-modules when module is selected
  useEffect(() => {
    if (selectedModule) {
      fetchSubModules(selectedModule);
    }
  }, [selectedModule, fetchSubModules]);

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
        setModelOutput(result.callModelForManualEval.output || '');
        setLatencyMs(result.callModelForManualEval.latencyMs);
        setHasCalledModel(true);
      } else {
        setError(result?.callModelForManualEval?.message || 'Failed to call model');
      }
    } catch (err: any) {
      setError(err.message || 'Error calling model');
    } finally {
      setIsCallingModel(false);
    }
  };

  // Submit test case
  const handleSubmitTestCase = async () => {
    if (!selectedModule || !status) return;

    // Validate failed test case
    if (status === 'FAILED' && (!issueType || !severity)) {
      setError('Please select issue type and severity for failed test cases');
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
          };
        };
      }>(
        SUBMIT_TEST_CASE_MUTATION,
        {
          input: {
            auditId,
            module: selectedModule,
            subModule: issueType || null,
            sourceLanguage: sourceLanguage || null,
            targetLanguage: targetLanguage || null,
            inputPrompt: inputPrompt.trim(),
            modelOutput,
            status,
            issueType: status === 'FAILED' ? issueType : null,
            severity: status === 'FAILED' ? severity : null,
            comments: comments || null,
            idealOutput: status === 'FAILED' ? idealOutput : null,
          },
        },
        { organization: orgId }
      );

      if (result?.submitManualTestCase?.success) {
        // Reset form for next test case
        resetTestCaseForm();
        // Refresh data
        await Promise.all([fetchEvaluationStatus(), fetchTestCases()]);
      } else {
        setError(result?.submitManualTestCase?.message || 'Failed to submit test case');
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting test case');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete module evaluation
  const handleCompleteModule = async () => {
    if (!selectedModule) return;

    const progress = moduleProgress.find((p) => p.module === selectedModule);
    if (!progress || progress.testCaseCount < 3) {
      setError('Module requires at least 3 test cases');
      return;
    }

    setIsCompletingModule(true);
    setError(null);

    try {
      const result = await request<{
        completeModuleEvaluation: {
          success: boolean;
          message: string;
          canFinishEvaluation: boolean;
        };
      }>(
        COMPLETE_MODULE_MUTATION,
        {
          input: {
            auditId,
            module: selectedModule,
          },
        },
        { organization: orgId }
      );

      if (result?.completeModuleEvaluation?.success) {
        setCanFinishEvaluation(result.completeModuleEvaluation.canFinishEvaluation);
        setSelectedModule(null);
        await fetchEvaluationStatus();
      } else {
        setError(result?.completeModuleEvaluation?.message || 'Failed to complete module');
      }
    } catch (err: any) {
      setError(err.message || 'Error completing module');
    } finally {
      setIsCompletingModule(false);
    }
  };

  // Finish entire evaluation
  const handleFinishEvaluation = async () => {
    try {
      const result = await request<{
        finishManualEvaluation: {
          success: boolean;
          message: string;
          auditId?: number;
        };
      }>(FINISH_EVALUATION_MUTATION, { auditId }, { organization: orgId });

      if (result?.finishManualEvaluation?.success) {
        router.push(`/${locale}/dashboard/ai-maker/${orgId}/evaluations/${auditId}`);
      } else {
        setError(result?.finishManualEvaluation?.message || 'Failed to finish evaluation');
      }
    } catch (err: any) {
      setError(err.message || 'Error finishing evaluation');
    }
  };

  // Reset form for next test case
  const resetTestCaseForm = () => {
    setInputPrompt('');
    setModelOutput('');
    setLatencyMs(undefined);
    setHasCalledModel(false);
    setStatus(null);
    setIssueType('');
    setSeverity('');
    setComments('');
    setIdealOutput('');
  };

  // Get current module progress
  const currentModuleProgress = selectedModule
    ? moduleProgress.find((p) => p.module === selectedModule)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner/>
        <Text variant="bodyMd" className="ml-3">
          Loading evaluation...
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Text variant="headingLg" className="mb-2">
          Manual Evaluation
        </Text>
        <Text variant="bodySm" className="text-gray-500">
          Test each module with at least 3 test cases. Evaluate model outputs and mark them as passed or failed.
        </Text>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <Text variant="bodySm" className="text-red-700">
            {error}
          </Text>
        </div>
      )}

      {/* Module Selection */}
      {!selectedModule && (
        <ModuleSelector
          modules={modules}
          moduleProgress={moduleProgress}
          selectedModule={selectedModule}
          onSelectModule={setSelectedModule}
          getModuleDisplayName={getModuleDisplayName}
        />
      )}

      {/* Test Case Flow */}
      {selectedModule && (
        <div className="space-y-6">
          {/* Module header with progress */}
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div>
              <Text variant="headingMd">
                {getModuleDisplayName(selectedModule)}
              </Text>
              <Text variant="bodySm" className="text-gray-600">
                {currentModuleProgress?.testCaseCount || 0} / 3 test cases completed
              </Text>
            </div>
            <div className="flex gap-3">
              <Button kind="secondary" onClick={() => setSelectedModule(null)}>
                Change Module
              </Button>
              {currentModuleProgress && currentModuleProgress.testCaseCount >= 3 && (
                <Button
                  kind="primary"
                  onClick={handleCompleteModule}
                  disabled={isCompletingModule}
                >
                  {isCompletingModule ? 'Completing...' : 'Complete Module'}
                </Button>
              )}
            </div>
          </div>

          {/* Test Case Number */}
          <Tag variation="outlined" textColor="#7C3AED" borderColor="#C4B5FD">
            <Text variant="bodySm" fontWeight="medium">
              Test Case #{(currentModuleProgress?.testCaseCount || 0) + 1}
            </Text>
          </Tag>

          {/* Input Section */}
          <TestCaseInput
            moduleName={selectedModule}
            moduleDisplayName={getModuleDisplayName(selectedModule)}
            supportedLanguages={supportedLanguages}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            inputPrompt={inputPrompt}
            isCallingModel={isCallingModel}
            onSourceLanguageChange={setSourceLanguage}
            onTargetLanguageChange={setTargetLanguage}
            onInputPromptChange={setInputPrompt}
            onSubmitPrompt={handleCallModel}
          />

          {/* Output and Evaluation */}
          {hasCalledModel && (
            <>
              <ModelOutputDisplay
                output={modelOutput}
                latencyMs={latencyMs}
                status={status}
                onStatusChange={setStatus}
              />

              {/* Failure Details */}
              {status === 'FAILED' && (
                <FailureDetails
                  subModules={subModules}
                  issueType={issueType}
                  severity={severity}
                  comments={comments}
                  idealOutput={idealOutput}
                  onIssueTypeChange={setIssueType}
                  onSeverityChange={setSeverity}
                  onCommentsChange={setComments}
                  onIdealOutputChange={setIdealOutput}
                />
              )}

              {/* Submit Button */}
              {status && (
                <div className="flex justify-center">
                  <Button
                    kind="primary"
                    onClick={handleSubmitTestCase}
                    disabled={isSubmitting || (status === 'FAILED' && (!issueType || !severity))}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit & Next Test Case'}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Test Case History */}
          <TestCaseHistory
            testCases={testCases}
            moduleName={selectedModule}
            moduleDisplayName={getModuleDisplayName(selectedModule)}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-center gap-6 pt-8 border-t border-gray-200">
        <Button kind="secondary" onClick={onPrevious} className="previous-button">
          <Image
            src="/images/icons/circle-arrow-left.png"
            alt="Previous"
            width={18}
            height={18}
            className="object-contain previous-icon"
          />
          <span className="previous-text">Previous</span>
        </Button>

        <Button
          kind="primary"
          onClick={handleFinishEvaluation}
          disabled={!canFinishEvaluation || isRequestingAudit}
          className="run-audit-button"
        >
          <span className="run-audit-text">
            {isRequestingAudit ? 'Finishing...' : 'Finish Evaluation'}
          </span>
          <Image
            src="/images/icons/circle-arrow-right.png"
            alt="Finish"
            width={18}
            height={18}
            className="object-contain run-audit-icon"
          />
        </Button>
      </div>

      {!canFinishEvaluation && (
        <Text variant="bodySm" className="text-center text-gray-500">
          Complete at least 3 test cases for each module to finish the evaluation.
        </Text>
      )}
    </div>
  );
};

// Fallback sub-modules
function getFallbackSubModules(moduleName: string): SubModuleInfo[] {
  const fallbacks: Record<string, SubModuleInfo[]> = {
    BIAS_FAIRNESS: [
      { name: 'GENDER_BIAS', displayName: 'Gender Bias' },
      { name: 'CASTE_BIAS', displayName: 'Caste Bias' },
      { name: 'REGIONAL_BIAS', displayName: 'Regional Bias' },
      { name: 'RELIGION_BIAS', displayName: 'Religion Bias' },
      { name: 'SOCIO_ECONOMIC_BIAS', displayName: 'Socio-economic Bias' },
    ],
    HALLUCINATION_MISINFORMATION: [
      { name: 'HALLUCINATION', displayName: 'Hallucination' },
      { name: 'FACTUAL_ERROR', displayName: 'Factual Error' },
      { name: 'MISLEADING_INFO', displayName: 'Misleading Information' },
    ],
    PRIVACY_SAFETY: [
      { name: 'PII_LEAKAGE', displayName: 'PII Leakage' },
      { name: 'UNSAFE_CONTENT', displayName: 'Unsafe Content' },
      { name: 'TOXICITY', displayName: 'Toxicity' },
    ],
  };
  return fallbacks[moduleName] || [];
}

export default ManualEvaluationFlow;
