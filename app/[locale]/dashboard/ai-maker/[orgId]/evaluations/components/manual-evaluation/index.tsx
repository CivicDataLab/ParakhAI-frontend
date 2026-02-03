'use client';

import { useGraphQL } from '@/lib/api';
import RichTextRenderer from '@/components/RichTextRenderer';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Button, Label, Select, Spinner, Tag, Text, TextField } from 'opub-ui';
import React, { useCallback, useEffect, useState } from 'react';
import { IconCircleArrowRight } from '@tabler/icons-react';
import FailureDetails from './FailureDetails';
import ModelOutputDisplay from './ModelOutputDisplay';
import ModuleSelector from './ModuleSelector';
import RecommendationModal from './RecommendationModal';
import TestCaseHistory from './TestCaseHistory';
import TestCaseInput from './TestCaseInput';
import {
  LANGUAGE_OPTIONS,
  SEVERITY_OPTIONS,
  type ManualEvaluationStatus,
  type ManualTestCase,
  type ModuleProgress,
  type SubModuleInfo,
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
  mutation FinishManualEvaluation($input: FinishManualEvaluationInput!) {
    finishManualEvaluation(input: $input) {
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

  // Modal state for recommendations
  const [showModuleRecommendationModal, setShowModuleRecommendationModal] = useState(false);
  const [showOverallRecommendationModal, setShowOverallRecommendationModal] = useState(false);

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

  const handleCompleteModule = async (recommendation: string) => {
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
            recommendation: recommendation || null,
          },
        },
        { organization: orgId }
      );

      if (result?.completeModuleEvaluation?.success) {
        setCanFinishEvaluation(result.completeModuleEvaluation.canFinishEvaluation);
        setSelectedModule(null);
        setShowModuleRecommendationModal(false);
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

  const handleFinishEvaluation = async (recommendation: string) => {
    try {
      const result = await request<{
        finishManualEvaluation: {
          success: boolean;
          message: string;
          auditId?: number;
        };
      }>(FINISH_EVALUATION_MUTATION, { input: { auditId, recommendation: recommendation || null } }, { organization: orgId });

      if (result?.finishManualEvaluation?.success) {
        setShowOverallRecommendationModal(false);
        router.push(`/${locale}/dashboard/ai-maker/${orgId}/evaluations/${auditId}`);
      } else {
        setError(result?.finishManualEvaluation?.message || 'Failed to finish evaluation');
      }
    } catch (err: any) {
      setError(err.message || 'Error finishing evaluation');
    }
  };

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
      {/* Header - only show when module is selected */}
      {selectedModule && (
        <div>
          <Text variant="headingLg" className="mb-1 block">
            Test Cases for Module: {getModuleDisplayName(selectedModule)}
          </Text>
          <button
            onClick={() => setSelectedModule(null)}
            className="text-[#6849EE] hover:underline mb-4 block border-none bg-transparent p-0"
          >
            <Text variant="bodySm" className="text-[#6849EE]">
              &lt; Change Module
            </Text>
          </button>
        </div>
      )}


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
          {/* Test Case Number and Language Selectors */}
          <div className="flex items-center justify-between">
            <div>
              <Tag
                variation="filled"
                fillColor="#E5E7EB"
                textColor="#374151"
              >
                <Text variant="bodySm" fontWeight="medium">
                  Test Case: {(currentModuleProgress?.testCaseCount || 0) + 1}
                </Text>
              </Tag>
            </div>
            {supportedLanguages && supportedLanguages.length > 1 && (
              <div className="flex gap-4">
                <div className="w-48">
                  <Select
                    name="sourceLanguage"
                    label="Source Language"
                    labelHidden
                    options={LANGUAGE_OPTIONS.filter((opt) => supportedLanguages.includes(opt.value))}
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
                    options={LANGUAGE_OPTIONS.filter((opt) => supportedLanguages.includes(opt.value))}
                    value={targetLanguage}
                    onChange={setTargetLanguage}
                    placeholder="Select"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Input and Output Panels Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Panel */}
            <div className="manual-eval-input-panel p-6 bg-white">
              <Text variant="bodyMd" fontWeight="medium" className="mb-4 block">
                Input
              </Text>
              <TextField
                name="inputPrompt"
                label="Input Prompt"
                labelHidden
                multiline={12}
                value={inputPrompt}
                onChange={setInputPrompt}
                placeholder="Type your prompt here"
              />
              <div className="flex justify-end mt-4">
                <Button
                  kind="primary"
                  onClick={handleCallModel}
                  disabled={!inputPrompt.trim() || isCallingModel}
                  className="bg-[#6849EE] hover:bg-[#6849EE] text-white hover:text-white disabled:text-gray-400"
                >
                  {isCallingModel ? 'Calling...' : 'Submit'}
                </Button>
              </div>
            </div>

            {/* Output Panel */}
            <div className="manual-eval-input-panel p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <Text variant="bodyMd" fontWeight="medium">
                  Output
                </Text>
                {latencyMs && (
                  <Tag variation="outlined" textColor="#6B7280" borderColor="#D1D5DB">
                    {latencyMs.toFixed(0)}ms
                  </Tag>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[200px] max-h-[400px] overflow-y-auto mb-4">
                <div className="-ml-4">
                  {hasCalledModel ? (
                    modelOutput ? (
                      <RichTextRenderer content={modelOutput} />
                    ) : (
                      <Text variant="bodySm">No output received</Text>
                    )
                  ) : (
                    <Text variant="bodySm" className="text-gray-500">
                      Output will appear here after submitting the prompt
                    </Text>
                  )}
                </div>
              </div>
              {hasCalledModel && (
                <div className="flex justify-end gap-3">
                  <Button
                    kind="secondary"
                    onClick={() => setStatus('PASSED')}
                    className={
                      status === 'PASSED'
                        ? 'border-2 border-green-600 bg-green-50 text-green-700'
                        : ''
                    }
                  >
                    ✓ Passed
                  </Button>
                  <Button
                    kind="secondary"
                    onClick={() => setStatus('FAILED')}
                    className={
                      status === 'FAILED'
                        ? 'border-2 border-red-600 bg-red-50 text-red-700'
                        : ''
                    }
                  >
                    ✕ Failed
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Provide Issue Details */}
          {hasCalledModel && status === 'FAILED' && (
            <div className="space-y-6 p-6 bg-white rounded-lg border border-gray-200">
              <div className="text-center">
                <Text variant="headingMd" className="block">
                  Provide Issue Details
                </Text>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Issue and Risk Severity */}
                <div className="space-y-6">
                  <div>
                    <Label className="audit-form-label">
                      <Text variant="bodyMd" fontWeight="medium">
                        Issue <span className="text-red-500">*</span>
                      </Text>
                    </Label>
                    <div className="mt-2">
                      <Select
                        name="issueType"
                        label="Issue"
                        labelHidden
                        options={subModules.map((sm) => ({
                          value: sm.name,
                          label: sm.displayName,
                        }))}
                        value={issueType}
                        onChange={setIssueType}
                        placeholder="Select"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="audit-form-label">
                      <Text variant="bodyMd" fontWeight="medium">
                        Risk Severity <span className="text-red-500">*</span>
                      </Text>
                    </Label>
                    <div className="mt-2">
                      <Select
                        name="severity"
                        label="Risk Severity"
                        labelHidden
                        options={SEVERITY_OPTIONS}
                        value={severity}
                        onChange={setSeverity}
                        placeholder="Select"
                      />
                    </div>
                  </div>
                </div>
                {/* Middle Column: Comments */}
                <div>
                  <Label className="audit-form-label">
                    <Text variant="bodyMd" fontWeight="medium">
                      Comments
                    </Text>
                  </Label>
                  <div className="comments-textfield-wrapper mt-2">
                    <TextField
                      name="comments"
                      label="Comments"
                      labelHidden
                      multiline={12}
                      value={comments}
                      onChange={setComments}
                      placeholder="Type here"
                    />
                  </div>
                </div>
                {/* Right Column: Ideal Output */}
                <div>
                  <Label className="audit-form-label">
                    <Text variant="bodyMd" fontWeight="medium">
                      What would an ideal output look like?
                    </Text>
                  </Label>
                  <div className="comments-textfield-wrapper mt-2">
                    <TextField
                      name="idealOutput"
                      label="Ideal Output"
                      labelHidden
                      multiline={12}
                      value={idealOutput}
                      onChange={setIdealOutput}
                      placeholder="Type here"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save and Next Test Case Button */}
          {hasCalledModel && status && (
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSubmitTestCase}
                disabled={isSubmitting || (status === 'FAILED' && (!issueType || !severity))}
                className="bg-transparent hover:bg-transparent border-none shadow-none text-black hover:text-black px-0 py-0 disabled:text-gray-400 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <span className="save-next-test-case-text">
                  {isSubmitting ? 'Saving...' : 'Save and Next Test Case'}
                </span>
                <IconCircleArrowRight 
                  className="text-[#0A0704]" 
                  width={24} 
                  height={24} 
                  stroke={1.5}
                  color="#0A0704"
                />
              </button>
              {currentModuleProgress && currentModuleProgress.testCaseCount >= 3 && (
                <Button
                  kind="primary"
                  onClick={() => setShowModuleRecommendationModal(true)}
                  disabled={isCompletingModule}
                  className="bg-[#6849EE] hover:bg-[#6849EE] text-white hover:text-white px-8 py-3"
                >
                  {isCompletingModule ? 'Completing...' : 'Complete Module'}
                </Button>
              )}
            </div>
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
        <Button
          kind="primary"
          onClick={() => setShowOverallRecommendationModal(true)}
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

      {/* Module Recommendation Modal */}
      <RecommendationModal
        open={showModuleRecommendationModal}
        onOpenChange={setShowModuleRecommendationModal}
        title="Module Recommendation"
        description={`Enter your recommendation for the ${selectedModule ? getModuleDisplayName(selectedModule) : ''} module.`}
        placeholder="Enter your recommendation for this module (optional)"
        onSubmit={handleCompleteModule}
        isSubmitting={isCompletingModule}
        submitButtonText="Complete Module"
      />

      {/* Overall Recommendation Modal */}
      <RecommendationModal
        open={showOverallRecommendationModal}
        onOpenChange={setShowOverallRecommendationModal}
        title="Overall Recommendation"
        description="Enter your overall recommendation for this evaluation."
        placeholder="Enter your overall recommendation (optional)"
        onSubmit={handleFinishEvaluation}
        isSubmitting={isRequestingAudit}
        submitButtonText="Finish Evaluation"
      />
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
