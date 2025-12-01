'use client';

import React, { useEffect, useState } from 'react';
import { Button, Tag, Text, Icon, TextField, Label, Select, DataTable, DropZone, Card, ProgressBar } from 'opub-ui';
import type { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import {
  IconCheck,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconUpload,
  IconCloudUpload,
  IconArrowLeft,
  IconArrowRight,
  IconClipboard,
  IconRefresh,
  IconCircle,
} from '@tabler/icons-react';
import BreadCrumbs from '@/components/Breadcrumbs';
import WelcomeSection from '../../../components/WelcomeSection';
import { toTitleCase } from '@/lib/utils';

type AuditType = 'technical' | 'domain' | 'cultural';

type SelectOption = { value: string; label: string };

// We call USI GraphQL like:
// { modules(limit: 50) }
// where `modules` returns a JSON blob shaped like the example you shared.
const EVALUATION_MODULES_QUERY = `
  query EvaluationModules($limit: Int!) {
    modules(limit: $limit)
  }
`;

const NewAuditPage = () => {
  const [auditType, setAuditType] = useState<AuditType>('technical');
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'results'>('config');
  const [auditName, setAuditName] = useState('Untitled Audit - 20 March 2023 - 10:30AM');
  const modelName = 'Region-al';
  const modelVersion = 'Ver. 1.2.1';
  const isAutoSaved = true;

  // Form state (no default filled values)
  const [auditorName, setAuditorName] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [auditObjective, setAuditObjective] = useState('');
  const [scopeOfAudit, setScopeOfAudit] = useState('');
  const [biasFairness, setBiasFairness] = useState(false);
  const [hallucination, setHallucination] = useState(false);
  const [privacySecurity, setPrivacySecurity] = useState(false);
  const [biasFairnessSubmodules, setBiasFairnessSubmodules] = useState<string>('');
  const [hallucinationSubmodules, setHallucinationSubmodules] = useState<string>('');
  const [privacySecuritySubmodules, setPrivacySecuritySubmodules] = useState<string>('');
  const [modeOfEvaluation, setModeOfEvaluation] = useState<string>('');

  // Evaluation modules loaded from USI GraphQL API
  const [submoduleOptions, setSubmoduleOptions] = useState<SelectOption[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState<boolean>(false);
  const [modulesError, setModulesError] = useState<string | null>(null);

  // Test Cases state
  const [selectedPromptLibraries, setSelectedPromptLibraries] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [pastedTestCases, setPastedTestCases] = useState('');
  const [testInputMode, setTestInputMode] = useState<'paste' | 'upload'>('paste');

  // Load evaluation modules from USI GraphQL API
  useEffect(() => {
    const endpoint = process.env.NEXT_PUBLIC_USI_GRAPHQL_ENDPOINT;
    if (!endpoint) {
      // Fail silently in UI but log for developers
      console.warn('NEXT_PUBLIC_USI_GRAPHQL_ENDPOINT is not set');
      return;
    }

    const fetchEvaluationModules = async () => {
      try {
        setIsLoadingModules(true);
        setModulesError(null);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: EVALUATION_MODULES_QUERY,
            variables: { limit: 50 },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();

        if (json.errors?.length) {
          console.error('GraphQL errors while fetching evaluation modules', json.errors);
          throw new Error('GraphQL error');
        }

        const modulesData = json?.data?.modules ?? {};

        // Traverse all task types (e.g., text_generation, translation),
        // then all categories (e.g., bias_fairness, robustness),
        // then their metrics, without hard-coding any names.
        const options: SelectOption[] = [];

        Object.values(modulesData || {}).forEach((taskType: any) => {
          if (!taskType || typeof taskType !== 'object') return;

          Object.values(taskType).forEach((category: any) => {
            const metrics = category?.metrics;
            if (!metrics || typeof metrics !== 'object') return;

            Object.entries(metrics).forEach(
              ([metricKey, metric]: [string, any]) => {
                const sectors = metric?.tools?.deepeval?.sectors;
                const sectorValue =
                  sectors?.healthcare ??
                  (sectors && Object.values(sectors)[0]) ??
                  {};

                const labelRaw =
                  sectorValue?.template_display_name ||
                  sectorValue?.metric_display_name ||
                  metricKey.replace(/_/g, ' ');

                options.push({
                  value: metricKey,
                  label: toTitleCase(labelRaw),
                });
              }
            );
          });
        });

        setSubmoduleOptions(options);
      } catch (error: any) {
        console.error('Failed to load evaluation modules', error);
        setModulesError('Failed to load evaluation modules');
      } finally {
        setIsLoadingModules(false);
      }
    };

    fetchEvaluationModules();
  }, []);

  // Mode of evaluation options
  const modeOfEvaluationOptions = [
    { value: 'automated', label: 'Automated' },
    { value: 'manual', label: 'Manual' },
    { value: 'hybrid', label: 'Hybrid' },
  ];

  // Prompt libraries data
  const promptLibraries = [
    {
      id: '1',
      name: 'Regional Prompts No. #1',
      sector: 'Sector Name',
      module: 'Bias & Fairness, Hallucin...',
      owner: 'ParakhAI',
    },
    {
      id: '2',
      name: 'Regional Prompts No. #2',
      sector: 'Sector Name',
      module: 'All Modules',
      owner: 'ParakhAI',
    },
    {
      id: '3',
      name: 'Regional Prompts No. #3',
      sector: 'Sector Name',
      module: 'Module name',
      owner: 'ParakhAI',
    },
    {
      id: '4',
      name: 'Regional Prompts No. #4',
      sector: 'Sector Name',
      module: 'Module name',
      owner: 'ParakhAI',
    },
    {
      id: '5',
      name: 'Regional Prompts No. #5',
      sector: 'Sector Name',
      module: 'Module name',
      owner: 'ParakhAI',
    },
    {
      id: '6',
      name: 'Regional Prompts No. #6',
      sector: 'Sector Name',
      module: 'Module name',
      owner: 'ParakhAI',
    },
    {
      id: '7',
      name: 'Regional Prompts No. #7',
      sector: 'Sector Name',
      module: 'Module name',
      owner: 'ParakhAI',
    },
  ];

  type PromptLibrary = typeof promptLibraries[number];

  const promptLibraryColumns: ColumnDef<PromptLibrary>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true,
      cell: ({ getValue }) => (
        <a href="#" className="text-primary-purple hover:underline">
          {getValue<string>()}
        </a>
      ),
    },
    {
      accessorKey: 'sector',
      header: 'Sector',
    },
    {
      accessorKey: 'module',
      header: 'Module',
    },
    {
      accessorKey: 'owner',
      header: 'Owner',
    },
    {
      id: 'preview',
      header: 'Preview',
      enableSorting: false,
      cell: () => (
        <Icon source={IconEye} size={20} color="success" />
      ),
    },
  ];

  // Test Cases data
  type TestCase = {
    id: string;
    input: string;
    output: string;
    evaluationModule: string;
    evaluationMetric: string;
    riskSeverity: 'High' | 'Medium' | 'Low' | 'No risk';
  };

  const testCasesData: TestCase[] = [
    {
      id: '1',
      input: 'क्या पेट दर्द का इलाज 10 लीटर... (Can stomach pain be cur...)',
      output: 'Can stomach pain be cur...',
      evaluationModule: 'Bias and Fairness',
      evaluationMetric: 'Economic',
      riskSeverity: 'High',
    },
    {
      id: '2',
      input: 'क्या साँप के काटने पर हल्दी खा... (Will eating turmeric auto...)',
      output: 'Will eating turmeric auto...',
      evaluationModule: 'Bias and Fairness',
      evaluationMetric: 'Gender',
      riskSeverity: 'Medium',
    },
    {
      id: '3',
      input: 'क्या महिलाएँ पुरुषों की तुलना में... (Do women report more p...)',
      output: 'Do women report more p...',
      evaluationModule: 'Hallucination',
      evaluationMetric: 'Misinformation',
      riskSeverity: 'High',
    },
    {
      id: '4',
      input: 'मैं HIV पॉज़िटिव हूँ, क्या यहाँ के... (I am HIV positive and the...)',
      output: 'I am HIV positive and the...',
      evaluationModule: 'Bias and Fairness',
      evaluationMetric: 'Gender',
      riskSeverity: 'Low',
    },
    {
      id: '5',
      input: 'मेरे सिर में हल्का दर्द है, क्या मुझझे.... (I have a mild headache,...)',
      output: 'I have a mild headache,...',
      evaluationModule: 'Hallucination',
      evaluationMetric: 'Misinformation',
      riskSeverity: 'No risk',
    },
  ];

  const testCasesColumns: ColumnDef<TestCase>[] = [
    {
      accessorKey: 'input',
      header: 'Input',
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="datatable-text-wrap">{getValue<string>()}</Text>
      ),
    },
    {
      accessorKey: 'output',
      header: 'Output',
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="datatable-text-wrap">{getValue<string>()}</Text>
      ),
    },
    {
      accessorKey: 'evaluationModule',
      header: 'Evaluation Module',
      enableSorting: true,
    },
    {
      accessorKey: 'evaluationMetric',
      header: 'Evaluation Metric',
      enableSorting: true,
    },
    {
      accessorKey: 'riskSeverity',
      header: 'Risk Severity',
      enableSorting: true,
      cell: ({ getValue }) => {
        const severity = getValue<'High' | 'Medium' | 'Low' | 'No risk'>();
        const colorMap = {
          High: { textColor: '#EF4444' },
          Medium: { textColor: '#F97316' },
          Low: { textColor: '#10B981' },
          'No risk': { textColor: '#000000' },
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
  ];

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
          <div className="flex items-center justify-between mb-6 gap-4 audit-name-section">
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
            <div className="flex items-center gap-4 audit-status-container flex-shrink-0">
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
          <div className="mb-8">
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
            <div className="mb-8">
              <Label htmlFor="auditType" className="block audit-type-label">
                <Text variant="bodyMd" fontWeight="medium">
                  Audit Type <span className="text-red-500">*</span>
                </Text>
              </Label>

              <div className="flex gap-4 audit-options-container">
                {/* Technical Audit Option */}
                <label
                  className={`flex items-start gap-3 cursor-pointer transition-all technical-audit-card ${
                    auditType === 'technical'
                      ? ''
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="auditType"
                    value="technical"
                    checked={auditType === 'technical'}
                    onChange={(e) => setAuditType(e.target.value as AuditType)}
                    className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
                  />
                  <div className="flex-1">
                    <Text
                      variant="bodyMd"
                      fontWeight="semibold"
                      className="text-gray-900 mb-2 whitespace-nowrap"
                    >
                      Technical Audit
                    </Text>
                    <Text variant="bodySm" className="text-gray-600 block whitespace-nowrap">
                      Check performance, safety, drift
                    </Text>
                  </div>
                </label>

                {/* Domain Audit Option */}
                <label
                  className={`flex items-start gap-3 cursor-pointer transition-all domain-audit-card ${
                    auditType === 'domain'
                      ? ''
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="auditType"
                    value="domain"
                    checked={auditType === 'domain'}
                    onChange={(e) => setAuditType(e.target.value as AuditType)}
                    className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
                  />
                  <div className="flex-1">
                    <Text
                      variant="bodyMd"
                      fontWeight="semibold"
                      className="text-gray-900 mb-2 whitespace-nowrap"
                    >
                      Domain Audit
                    </Text>
                    <Text variant="bodySm" className="text-gray-600 block whitespace-nowrap">
                      Check accuracy within domain context
                    </Text>
                  </div>
                </label>

                {/* Cultural Audit Option */}
                <label
                  className={`flex items-start gap-3 cursor-pointer transition-all cultural-audit-card ${
                    auditType === 'cultural'
                      ? ''
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="auditType"
                    value="cultural"
                    checked={auditType === 'cultural'}
                    onChange={(e) => setAuditType(e.target.value as AuditType)}
                    className="mt-1 w-4 h-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
                  />
                  <div className="flex-1">
                    <Text
                      variant="bodyMd"
                      fontWeight="semibold"
                      className="text-gray-900 mb-2 whitespace-nowrap"
                    >
                      Cultural Audit
                    </Text>
                    <Text variant="bodySm" className="text-gray-600 block whitespace-nowrap">
                      Expert checks for real-world fit
                    </Text>
                  </div>
                </label>
              </div>

              {/* Audit Configuration Form - Show when Technical Audit is selected */}
              {auditType === 'technical' && (
                <div className="audit-config-form mt-8">
                  {/* Auditor Information Section */}
                  <div className="mb-6">
                    <div className="flex gap-6 flex-wrap">
                      <div className="flex-1 min-w-[300px] auditor-name-wrapper">
                        <Label htmlFor="auditorName" className="audit-form-label auditor-name-label">
                          <Text variant="bodyMd" fontWeight="medium">
                            Auditor name<span className="text-red-500">*</span>
                          </Text>
                        </Label>
                        <div className={`audit-form-textfield auditor-name-textfield ${auditorName ? 'has-value' : ''}`}>
                          <TextField
                            id="auditorName"
                            name="auditorName"
                            label="Auditor name"
                            labelHidden
                            value={auditorName}
                            onChange={(value) => setAuditorName(value)}
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-[300px] organisation-name-wrapper">
                        <Label htmlFor="organisationName" className="audit-form-label organisation-name-label">
                          <Text variant="bodyMd" fontWeight="medium">
                            Organisation Name<span className="text-red-500">*</span>
                          </Text>
                        </Label>
                        <div className={`audit-form-textfield organisation-name-textfield ${organisationName ? 'has-value' : ''}`}>
                          <TextField
                            id="organisationName"
                            name="organisationName"
                            label="Organisation Name"
                            labelHidden
                            value={organisationName}
                            onChange={(value) => setOrganisationName(value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audit Details Section */}
                  <div className="mb-6">
                    <div className="flex flex-col gap-6">
                      <div>
                        <Label htmlFor="auditObjective" className="audit-form-label audit-objective-label">
                          <Text variant="bodyMd" fontWeight="medium">
                            Audit Objective<span className="text-red-500">*</span>
                          </Text>
                        </Label>
                        <div className="audit-form-textarea audit-objective-textarea">
                          <TextField
                            id="auditObjective"
                            name="auditObjective"
                            label="Audit Objective"
                            labelHidden
                            multiline={4}
                            value={auditObjective}
                            onChange={(value) => setAuditObjective(value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="scopeOfAudit" className="audit-form-label scope-of-audit-label">
                          <Text variant="bodyMd" fontWeight="medium">
                            Scope of Audit<span className="text-red-500">*</span>
                          </Text>
                        </Label>
                        <div className="audit-form-textarea scope-of-audit-textarea">
                          <TextField
                            id="scopeOfAudit"
                            name="scopeOfAudit"
                            label="Scope of Audit"
                            labelHidden
                            multiline={4}
                            value={scopeOfAudit}
                            onChange={(value) => setScopeOfAudit(value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Modules Section */}
                  <div className="mb-6">
                    <Label className="audit-form-label evaluation-modules-label">
                      <Text variant="bodyMd" fontWeight="medium">
                        Evaluation Modules<span className="text-red-500">*</span>
                      </Text>
                    </Label>
                    <div className="flex flex-row gap-4 mt-4">
                      {/* Bias and Fairness Card with Dropdown */}
                      <div className="flex flex-col gap-2 evaluation-module-wrapper">
                        <label className="evaluation-module-card">
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={biasFairness}
                              onChange={(e) => setBiasFairness(e.target.checked)}
                              className="evaluation-module-checkbox"
                            />
                            <div className="flex-1 flex flex-col">
                              <Text variant="bodyMd" fontWeight="semibold" className="text-gray-900 mb-1">
                                Bias and Fairness
                              </Text>
                              <Text variant="bodySm" className="text-gray-600">
                                Checks whether model perpetuates stereotypes
                              </Text>
                            </div>
                          </div>
                        </label>
                        <div className="evaluation-module-dropdown">
                          <Select
                            name="biasFairnessSubmodules"
                            label="Select sub-modules from dropdown"
                            labelHidden
                            options={submoduleOptions}
                            value={biasFairnessSubmodules}
                            onChange={(value) => setBiasFairnessSubmodules(value)}
                            placeholder="Select sub-modules from dropdown"
                          />
                        </div>
                      </div>

                      {/* Hallucination Card with Dropdown */}
                      <div className="flex flex-col gap-2 evaluation-module-wrapper">
                        <label className="evaluation-module-card">
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={hallucination}
                              onChange={(e) => setHallucination(e.target.checked)}
                              className="evaluation-module-checkbox"
                            />
                            <div className="flex-1 flex flex-col">
                              <Text variant="bodyMd" fontWeight="semibold" className="text-gray-900 mb-1">
                                Hallucination
                              </Text>
                              <Text variant="bodySm" className="text-gray-600">
                                Detects false or unsafe outputs
                              </Text>
                            </div>
                          </div>
                        </label>
                        <div className="evaluation-module-dropdown">
                          <Select
                            name="hallucinationSubmodules"
                            label="Select sub-modules from dropdown"
                            labelHidden
                            options={submoduleOptions}
                            value={hallucinationSubmodules}
                            onChange={(value) => setHallucinationSubmodules(value)}
                            placeholder="Select sub-modules from dropdown"
                          />
                        </div>
                      </div>

                      {/* Privacy and Security Card with Dropdown */}
                      <div className="flex flex-col gap-2 evaluation-module-wrapper">
                        <label className="evaluation-module-card">
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={privacySecurity}
                              onChange={(e) => setPrivacySecurity(e.target.checked)}
                              className="evaluation-module-checkbox"
                            />
                            <div className="flex-1 flex flex-col">
                              <Text variant="bodyMd" fontWeight="semibold" className="text-gray-900 mb-1">
                                Privacy and Security
                              </Text>
                              <Text variant="bodySm" className="text-gray-600">
                                Ensures personal data is not exposed
                              </Text>
                            </div>
                          </div>
                        </label>
                        <div className="evaluation-module-dropdown">
                          <Select
                            name="privacySecuritySubmodules"
                            label="Select sub-modules from dropdown"
                            labelHidden
                            options={submoduleOptions}
                            value={privacySecuritySubmodules}
                            onChange={(value) => setPrivacySecuritySubmodules(value)}
                            placeholder="Select sub-modules from dropdown"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mode of Evaluation Section */}
                    <div className="mb-6 mt-6">
                      <Label className="audit-form-label evaluation-modules-label">
                        <Text variant="bodyMd" fontWeight="medium">
                          Mode of Evaluation<span className="text-red-500">*</span>
                        </Text>
                      </Label>
                      <div className="mt-4">
                        <div className="evaluation-module-dropdown mode-of-evaluation-dropdown">
                          <Select
                            name="modeOfEvaluation"
                            label="Mode of Evaluation"
                            labelHidden
                            options={modeOfEvaluationOptions}
                            value={modeOfEvaluation}
                            onChange={(value) => setModeOfEvaluation(value)}
                            placeholder="Click to select from dropdown"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'test' && (
            <div className="mb-8 space-y-8">
              {/* Select Prompt Library Section */}
              <div className="test-cases-table">
                <div className="mb-4">
                  <Text variant="headingMd" className="select-prompt-library-heading block">
                    Select Prompt Library
                  </Text>
                  <Text variant="bodySm" className="select-prompt-library-subtitle block">
                    You can select multiple prompt libraries.
                  </Text>
                </div>
                <DataTable
                  rows={promptLibraries}
                  columns={promptLibraryColumns}
                  hideSelection={false}
                  hideFooter={true}
                  onRowSelectionChange={(selected) => {
                    setSelectedPromptLibraries(selected as string[]);
                  }}
                />
              </div>

              {/* Enter Your Own Test Cases Section */}
              <div>
                <Text variant="headingMd" className="enter-test-cases-heading mb-4">
                  Enter Your Own Test Cases (optional)
                </Text>
                <div className="flex gap-1 mb-4 test-input-buttons-container">
                  <Button
                    kind="secondary"
                    onClick={() => setTestInputMode('paste')}
                    className={`test-input-button ${testInputMode === 'paste' ? 'test-input-button-selected' : ''}`}
                  >
                    <Icon source={IconClipboard} size={18} />
                    Paste Text
                  </Button>
                  <Button
                    kind="secondary"
                    onClick={() => setTestInputMode('upload')}
                    className={`test-input-button ${testInputMode === 'upload' ? 'test-input-button-selected' : ''}`}
                  >
                    <Icon source={IconUpload} size={18} />
                    Upload File
                  </Button>
                </div>

                {testInputMode === 'paste' ? (
                  <div className="test-cases-input-wrapper">
                    <Label className="audit-form-label evaluation-modules-label test-cases-label">
                      <Text variant="bodySm" fontWeight="medium">
                        Paste your test cases{' '}
                        <span className="text-gray-500">(comma separated values)</span>
                      </Text>
                    </Label>
                    <div className="test-cases-textarea-container">
                      <TextField
                        name="pastedTestCases"
                        label="Paste your test cases"
                        labelHidden
                        multiline={6}
                        value={pastedTestCases}
                        onChange={(value) => setPastedTestCases(value)}
                        placeholder={'Input, Expected output, etc.\nInput, Expected output, etc.\n...'}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="test-cases-input-wrapper">
                    <div className="test-cases-dropzone-container">
                  <DropZone
                    name="testCasesUpload"
                    accept=".csv,.xls,.xlsx"
                    onDrop={(files) => {
                      setUploadedFiles(files);
                    }}
                    outline
                    overlay
                  >
                    <div className="flex flex-col items-center justify-center py-12 px-6">
                      <Text variant="bodySm" className="mb-6 text-gray-600">
                        Drag and drop file
                      </Text>
                      <DropZone.FileUpload
                        actionTitle="Choose File to Upload"
                        actionHint="Supported File Types: CSV XLS XLSX"
                      />
                      <Text variant="bodySm" className="mt-6">
                        <a href="#" className="text-primary-purple hover:underline">
                          Download ParakhAI's prompt template
                        </a>
                      </Text>
                    </div>
                  </DropZone>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-center gap-6 pt-8 border-t border-gray-200">
                <Button
                  kind="secondary"
                  onClick={() => setActiveTab('config')}
                  className="previous-button"
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
                  kind="primary"
                  onClick={() => setActiveTab('results')}
                  className="run-audit-button"
                >
                  <span className="run-audit-text">Run Audit</span>
                  <Image
                    src="/images/icons/circle-arrow-right.png"
                    alt="Circle arrow right"
                    width={18}
                    height={18}
                    className="object-contain run-audit-icon"
                  />
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="mb-8 space-y-8">
              {/* Audit Overview Header */}
              <div className="audit-overview-section">
                <Text variant="headingMd" className="mb-4">
                  Audit Overview
                </Text>
                <Text variant="bodySm" className="audit-overview-summary-text">
                  Audit time: <span className="audit-overview-highlight">12 Sep 2025, 11:40 p.m</span><br />
                  Audit ID: <span className="audit-overview-highlight">dfrtxeg34-tech</span><br />
                  Duration: <span className="audit-overview-highlight">1004 s</span>
                </Text>
              </div>

              {/* Test Cases Table */}
              <div className="test-cases-table">
                <Text variant="headingMd" className="audit-results-test-cases-heading">
                  Test Cases
                </Text>
                <DataTable
                  rows={testCasesData}
                  columns={testCasesColumns}
                  sortColumns={['input', 'output', 'evaluationModule', 'evaluationMetric', 'riskSeverity']}
                  hideFooter={true}
                  hideSelection={true}
                />
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-center gap-6 pt-8 border-t border-gray-200">
                <Button
                  kind="secondary"
                  onClick={() => setActiveTab('test')}
                  className="previous-button"
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
                  kind="primary"
                  onClick={() => setActiveTab('results')}
                  className="run-audit-button"
                >
                  <span className="run-audit-text">Run Audit</span>
                  <Image
                    src="/images/icons/circle-arrow-right.png"
                    alt="Circle arrow right"
                    width={18}
                    height={18}
                    className="object-contain run-audit-icon"
                  />
                </Button>
              </div>
            </div>
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

