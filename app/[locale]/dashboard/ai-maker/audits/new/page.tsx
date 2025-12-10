'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button, Text, Icon, TextField, Label, Tag } from 'opub-ui';
import Image from 'next/image';
import { IconX } from '@tabler/icons-react';
import { useSearchParams } from 'next/navigation';
import BreadCrumbs from '@/components/Breadcrumbs';
import WelcomeSection from '../../../components/WelcomeSection';
import { toTitleCase } from '@/lib/utils';
import { useGraphQL } from '@/lib/api';
import AuditConfiguration from '../components/AuditConfiguration';
import TestCases from '../components/TestCases';
import AuditResults from '../components/AuditResults';
import type { AuditType, SelectOption, Module } from '../components/types';

// GraphQL queries for dynamic modules and metrics
const MODULES_BY_MODEL_TYPE_QUERY = `
  query GetModulesByModelType($modelType: String!) {
  modulesByModelType(modelType: $modelType) {
    name
    displayName
  }
}
`;

const METRICS_BY_MODEL_TYPE_QUERY = `
  query MetricsByModelType($modelType: String!) {
    metricsByModelType(modelType: $modelType) {
      name
      displayName
      description
      metrics {
        name
        displayName
        description
      }
    }
  }
`;

// Mutation to request an audit run from the backend
const REQUEST_AUDIT_MUTATION = `
  mutation RequestAudit($input: RequestAuditInput!) {
    requestAudit(input: $input) {
      success
      message
      audit {
        id
        name
        status
        modules
        metrics
        modelId
        testDatasetIds
        configuration
        judgeModel
        judgeConfig
        findings
        recommendations
        errorMessage
        errorDetails
        totalTests
        passedTests
        failedTests
        skippedTests
        overallScore
        createdAt
        startedAt
        completedAt
        updatedAt
      }
    }
  }
`;

const NewAuditPage = () => {
  const searchParams = useSearchParams();
  const [auditType, setAuditType] = useState<AuditType>('technical');
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'results'>('config');
  const [auditName, setAuditName] = useState('Untitled Audit - 20 March 2023 - 10:30AM');
  const modelName = 'Region-al';
  const modelVersion = 'Ver. 1.2.1';
  const modelType = 'TEXT_GENERATION'; // Full model type for GraphQL queries
  const isAutoSaved = true;

  // Handle tab query parameter on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'config' || tabParam === 'test' || tabParam === 'results') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  

  // Form state (no default filled values)
  const [auditorName, setAuditorName] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [auditObjective, setAuditObjective] = useState('');
  const [scopeOfAudit, setScopeOfAudit] = useState('');
  const [modeOfEvaluation, setModeOfEvaluation] = useState<string>('');

  // Dynamic modules state - stores modules fetched from API

  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({});
  const [selectedMetrics, setSelectedMetrics] = useState<Record<string, string>>({});
  const [moduleMetricsOptions, setModuleMetricsOptions] = useState<Record<string, SelectOption[]>>({});
  const [isLoadingModules, setIsLoadingModules] = useState<boolean>(false);
  const [modulesError, setModulesError] = useState<string | null>(null);

  // Test Cases state
  const [selectedPromptLibraries, setSelectedPromptLibraries] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [pastedTestCases, setPastedTestCases] = useState('');
  const [testInputMode, setTestInputMode] = useState<'paste' | 'upload'>('paste');

  // Backend audit run state
  const [isRequestingAudit, setIsRequestingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditOverview, setAuditOverview] = useState<{
    auditId: string | null;
    auditTime: string | null;
    durationSeconds: number | null;
  } | null>(null);

  // GraphQL API hook for authenticated requests
  const { request, isAuthenticated, isLoading: isSessionLoading, accessToken } = useGraphQL();
  

  // Helper function to map module name keys to display names
  const getModuleDisplayName = (moduleName: string): string => {
    const nameMap: Record<string, string> = {
      bias_fairness: 'Bias and Fairness',
      hallucination: 'Hallucination',
      privacy_security: 'Privacy and Security',
    };
    return nameMap[moduleName] || toTitleCase(moduleName.replace(/_/g, ' '));
  };

  // Track if modules have been fetched to prevent duplicate calls
  const modulesFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastModelTypeRef = useRef<string | null>(null);

  // Load evaluation modules from GraphQL API using modulesByModelType
  useEffect(() => {
    // Reset flags if modelType changed
    if (lastModelTypeRef.current !== null && lastModelTypeRef.current !== modelType) {
      modulesFetchedRef.current = false;
      isFetchingRef.current = false;
    }
    lastModelTypeRef.current = modelType;

    // Prevent duplicate calls - check multiple conditions
    if (
      !isAuthenticated || 
      isSessionLoading || 
      modulesFetchedRef.current || 
      isFetchingRef.current ||
      isLoadingModules
    ) {
      return;
    }

    // Mark as fetching IMMEDIATELY to prevent any race conditions
    isFetchingRef.current = true;
    modulesFetchedRef.current = true;

    const fetchModules = async () => {
      try {
        setIsLoadingModules(true);
        setModulesError(null);

        // Use authenticated GraphQL request - access token is automatically included
        const data = await request<{ modulesByModelType: Module[] }>(
          MODULES_BY_MODEL_TYPE_QUERY,
          { modelType }
        );

        const modulesData = Array.isArray(data?.modulesByModelType) 
          ? data.modulesByModelType 
          : [];
        setModules(modulesData);

        // Initialize selected modules state
        const initialSelected: Record<string, boolean> = {};
        if (Array.isArray(modulesData)) {
          modulesData.forEach((module: Module) => {
            if (module?.name) {
              initialSelected[module.name] = false;
            }
          });
        }
        setSelectedModules(initialSelected);
      } catch (error: any) {
        
        // Check if it's a connection error
        if (error?.message?.includes('Failed to fetch') || error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.message?.includes('Backend server')) {
          setModulesError('Backend server is not available. Please check if the GraphQL server is running on port 9001.');
          // Don't reset refs on connection error - prevent retry spam
        } else {
          setModulesError('Failed to load evaluation modules. Please ensure you are logged in.');
          // Reset refs on other errors so it can retry
          modulesFetchedRef.current = false;
        }
      } finally {
        setIsLoadingModules(false);
        isFetchingRef.current = false;
      }
    };

    fetchModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelType, isAuthenticated, isSessionLoading]); // Removed 'request' - it's now memoized and stable



  // Fetch metrics for a specific module using metricsByModelType
  const fetchMetricsForModule = async (moduleName: string): Promise<SelectOption[]> => {
    if (!isAuthenticated) {
      return [];
    }

    try {
      // Use authenticated GraphQL request - access token is automatically included
      const data = await request<{ metricsByModelType: Array<{ name: string; metrics: Array<{ name: string; displayName?: string }> }> }>(
        METRICS_BY_MODEL_TYPE_QUERY,
        { modelType }
      );

      const metricsData = data?.metricsByModelType || [];
      
      // Find metrics for the specific module
      const moduleMetrics = metricsData.find((m: any) => m.name === moduleName);
      if (!moduleMetrics || !moduleMetrics.metrics) {
        return [];
      }

      // Convert to SelectOption format
      return moduleMetrics.metrics.map((metric: any) => ({
        value: metric.name,
        label: metric.displayName || toTitleCase(metric.name.replace(/_/g, ' ')),
      }));
    } catch (error: any) {
      return [];
    }
  };

  /**
   * Helper to collect selected modules & metrics based on UI state
   */
  const buildModulesAndMetrics = () => {
    const selectedModuleNames: string[] = [];
    const selectedMetricNames: string[] = [];

    Object.entries(selectedModules).forEach(([moduleName, isSelected]) => {
      if (isSelected) {
        selectedModuleNames.push(moduleName);
        const metric = selectedMetrics[moduleName];
        if (metric) {
          selectedMetricNames.push(metric);
        }
      }
    });

    return { modules: selectedModuleNames, metrics: selectedMetricNames };
  };

  /**
   * Call backend GraphQL API to request an audit run.
   * Uses current form values and selected modules/metrics.
   */
  const handleRunAudit = async () => {
    if (!isAuthenticated) {
      setAuditError('Please log in to run an audit.');
      return;
    }

    const { modules, metrics } = buildModulesAndMetrics();

    // Build configuration payload from UI state (kept generic, backend can choose what to use)
    const configuration: any = {
      auditType,
      auditorName,
      organisationName,
      auditObjective,
      scopeOfAudit,
      modeOfEvaluation,
      testInputMode,
      selectedPromptLibraries,
      uploadedFilesCount: uploadedFiles.length,
      pastedTestCasesLength: pastedTestCases.length,
    };

    // Model ID can come from an env variable; backend fills the rest automatically
    const modelId = process.env.NEXT_PUBLIC_AUDIT_MODEL_ID;

    const input: any = {
      name: auditName,
      modules,
      metrics,
      testDatasetIds: [], // can be wired to real dataset ids later
      configuration,
    };

    if (modelId) {
      input.modelId = modelId;
    }

    // Move user into the Audit Results tab and show loading state
    setActiveTab('results');
    setAuditOverview(null);
    setIsRequestingAudit(true);
    setAuditError(null);

    try {
      // Use authenticated GraphQL request - access token is automatically included
      const result = await request<{ requestAudit: { success: boolean; message: string; audit: any } }>(
        REQUEST_AUDIT_MUTATION,
        { input }
      );

      const payload = result?.requestAudit;
      if (!payload) {
        setAuditError('Audit response was empty.');
        return;
      }

      const audit = payload.audit || {};

      const started = audit.started_at ? new Date(audit.started_at) : null;
      const completed = audit.completed_at ? new Date(audit.completed_at) : null;
      const created = audit.created_at ? new Date(audit.created_at) : null;

      const timeSource = completed || started || created;

      let durationSeconds: number | null = null;
      if (started && completed) {
        durationSeconds = Math.round(
          (completed.getTime() - started.getTime()) / 1000
        );
      }

      const formattedTime =
        timeSource?.toLocaleString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }) || null;

      setAuditOverview({
        auditId: audit.id ?? null,
        auditTime: formattedTime,
        durationSeconds,
      });
    } catch (error) {
      setAuditError('Network error while starting audit.');
    } finally {
      setIsRequestingAudit(false);
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-white">
      <BreadCrumbs
        data={[
          { href: '/', label: 'Home' },
          { href: '/dashboard', label: 'User Dashboard' },
          { href: '/dashboard/ai-maker', label: 'AI Maker Dashboard' },
          { href: '#', label: 'New Audit' },
        ]}
      />

      {/* Match Prompt Libraries / AI Maker layout so sticky nav + breadcrumbs behave the same on mobile */}
      <div className="flex flex-1 gap-8 px-8 main-content-wrapper">
        <WelcomeSection />

        <div className="flex-1 audit-content p-10">
          {/* Model Name and Owner Section */}
          <div className="mb-6">
            {/* Single line layout with gap */}
            <div className="flex items-center gap-4 mb-4 model-name-container">
              <Text as="h1" className="model-name-text">
                {modelName}
              </Text>
              <Text as="h2" className="model-name-text">
                {modelVersion}
              </Text>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Text variant="bodyMd">Owner:</Text>
              <Image
                src="/images/icons/CDL.png"
                alt="CDL"
                width={36}
                height={36}
                className="object-contain cdl-logo"
              />
            </div>
          </div>

          {/* Audit Name, Tag, and Status Section */}
          <div className="flex items-center justify-between mb-6 gap-4 audit-name-section max-[1023px]:mb-0.5 max-[1023px]:gap-0.5">
            {/* Left side: Label + Input + Tag */}
            <div className="flex items-center gap-4 flex-nowrap min-w-0 flex-1">
              <Label htmlFor="auditName" className="audit-name-label flex-shrink-0 whitespace-nowrap">
                Audit Name
              </Label>
              <div className="audit-name-input-wrapper flex-1 min-w-0">
                <TextField
                  id="auditName"
                  name="auditName"
                  label="Audit Name"
                  labelHidden
                  value={auditName}
                  onChange={(value) => setAuditName(value)}
                />
              </div>
              <div className="tag-wrapper audit-tag flex-shrink-0">
                <Tag variation="filled" fillColor="#E2F5C4" textColor="#0A0704">
                  {auditType === 'technical'
                    ? 'Technical Audit'
                    : auditType === 'domain'
                      ? 'Domain Audit'
                      : 'Cultural Audit'}
                </Tag>
              </div>
            </div>

            {/* Right side: Status */}
            <div className="flex items-center gap-4 audit-status-container flex-shrink-0 max-[1023px]:gap-0.5 max-[1023px]:mt-0">
              {isAutoSaved && (
                <div className="flex items-center audit-auto-saved-wrapper">
                  <Text className="audit-auto-saved">
                    Audit auto-saved
                  </Text>
                  <Image
                    src="/images/icons/circle-check.png"
                    alt="Circle check"
                    width={18}
                    height={18}
                    className="object-contain"
                  />
                </div>
              )}
              <Button
                kind="tertiary"
                variant="critical"
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this audit?')) {
                    window.history.back();
                  }
                }}
                className="cancel-audit-button"
              >
                Cancel Audit
                <Icon source={IconX} size={18} />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8 max-[1023px]:mb-4 max-[640px]:mb-2">
            <div className="flex gap-6 tabs-container">
              <button
                onClick={() => setActiveTab('config')}
                className={`audit-config-tab ${
                  activeTab === 'config'
                    ? 'audit-config-tab-active text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent'
                }`}
              >
                <Text
                  variant="bodyMd"
                  className={activeTab === 'config' ? 'text-gray-900 font-semibold' : 'text-gray-600'}
                >
                  Audit Configuration
                </Text>
              </button>
              <button
                onClick={() => setActiveTab('test')}
                className={`audit-config-tab ${
                  activeTab === 'test'
                    ? 'audit-config-tab-active text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent'
                }`}
              >
                <Text
                  variant="bodyMd"
                  className={activeTab === 'test' ? 'text-gray-900 font-semibold' : 'text-gray-600'}
                >
                  Test Cases
                </Text>
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`audit-config-tab ${
                  activeTab === 'results'
                    ? 'audit-config-tab-active text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent'
                }`}
              >
                <Text
                  variant="bodyMd"
                  className={activeTab === 'results' ? 'text-gray-900 font-semibold' : 'text-gray-600'}
                >
                  Audit Results
                </Text>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'config' && (
            <AuditConfiguration
              auditType={auditType}
              setAuditType={setAuditType}
              auditorName={auditorName}
              setAuditorName={setAuditorName}
              organisationName={organisationName}
              setOrganisationName={setOrganisationName}
              auditObjective={auditObjective}
              setAuditObjective={setAuditObjective}
              scopeOfAudit={scopeOfAudit}
              setScopeOfAudit={setScopeOfAudit}
              modeOfEvaluation={modeOfEvaluation}
              setModeOfEvaluation={setModeOfEvaluation}
              modules={modules}
              selectedModules={selectedModules}
              setSelectedModules={setSelectedModules}
              selectedMetrics={selectedMetrics}
              setSelectedMetrics={setSelectedMetrics}
              moduleMetricsOptions={moduleMetricsOptions}
              setModuleMetricsOptions={setModuleMetricsOptions}
              isLoadingModules={isLoadingModules}
              modulesError={modulesError}
              fetchMetricsForModule={fetchMetricsForModule}
              getModuleDisplayName={getModuleDisplayName}
              toTitleCase={toTitleCase}
            />
          )}

          {activeTab === 'test' && (
            <TestCases
              selectedPromptLibraries={selectedPromptLibraries}
              setSelectedPromptLibraries={setSelectedPromptLibraries}
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles}
              pastedTestCases={pastedTestCases}
              setPastedTestCases={setPastedTestCases}
              testInputMode={testInputMode}
              setTestInputMode={setTestInputMode}
              onPrevious={() => setActiveTab('config')}
              onRunAudit={handleRunAudit}
              isRequestingAudit={isRequestingAudit}
            />
          )}

          {activeTab === 'results' && (
            <AuditResults
              auditOverview={auditOverview}
              isRequestingAudit={isRequestingAudit}
              auditError={auditError}
              onDownloadReport={() => {
                // TODO: Implement download report functionality
                console.log('Download report clicked');
              }}
            />
          )}

          {/* Navigation Buttons - Audit Configuration tab */}
          {activeTab === 'config' && (
            <div className="flex items-center justify-center gap-6 pt-8">
              {/* Disabled Previous button on first step, styled like pagination control */}
              <Button
                kind="secondary"
                disabled
                className="previous-button previous-button-disabled"
              >
                <Image
                  src="/images/icons/circle-arrow-left.png"
                  alt="Circle arrow left"
                  width={18}
                  height={18}
                  className="object-contain previous-icon"
                />
                <span className="previous-text">Previous</span>
              </Button>

              <Button
                kind="secondary"
                onClick={() => setActiveTab('test')}
                className="add-test-cases-button"
              >
                <span className="add-test-cases-text">Add Test Cases</span>
                <Image
                  src="/images/icons/circle-arrow-right.png"
                  alt="Circle arrow right"
                  width={18}
                  height={18}
                  className="object-contain add-test-cases-icon"
                />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewAuditPage;

