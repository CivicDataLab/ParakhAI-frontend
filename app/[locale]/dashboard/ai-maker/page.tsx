'use client';

import React from 'react';
import { 
  Card, 
  Button, 
  Avatar, 
  Tag, 
  DataTable, 
  ProgressBar, 
  Text, 
  Icon, 
  Badge, 
  Divider 
} from 'opub-ui';
import { 
  IconCalendar, 
  IconUsers, 
  IconPlus, 
  IconCheck, 
  IconTool,
  IconMoodSad 
} from '@tabler/icons-react';
import { createColumnHelper } from '@tanstack/react-table';
import Link from 'next/link';
import BreadCrumbs from '@/components/Breadcrumbs';
import WelcomeSection from '../components/WelcomeSection';
import { Icons } from '@/components/icons';

// Define audit data type
type Audit = {
  model: string;
  auditTime: string;
  auditId: string;
  auditType: string;
  testResult: string;
  auditor: string;
};

type Model = {
  title: string;
  desc: string;
  date: string;
  testCases: string;
  audits: string;
  tags: string[];
  version: string;
};

const AIMakerDashboard = () => {
   const models: Model[] = [];
  //   { 
  //     title: 'Region-al', 
  //     desc: 'Context-aware translations between regional and less-common languages.',
  //     date: '21 Sep 2024',
  //     testCases: '1023 test cases',
  //     audits: '2 audits',
  //     tags: ['Translator', 'Low-Resource'],
  //     version: 'Ver. 1.2.1',
  //   },
  //   { 
  //     title: 'LinguaFlow', 
  //     desc: 'Multilingual model for smooth real-time translation across major world languages.',
  //     date: '21 Sep 2024',
  //     testCases: '1023 test cases',
  //     audits: '2 audits',
  //     tags: ['Translator'],
  //     version: 'Ver. 1.2.1',
  //   },
  //   { 
  //     title: 'Transcend', 
  //     desc: 'High-fidelity translation model for business and legal documentation.',
  //     date: '21 Sep 2024',
  //     testCases: '1023 test cases',
  //     audits: '2 audits',
  //     tags: ['Translator', 'Technical'],
  //     version: 'Ver. 1.2.1',
  //   },
  //   { 
  //     title: 'Mediscribe', 
  //     desc: 'Language model to interpret clinical text and generate patient-friendly summaries.',
  //     date: '21 Sep 2024',
  //     testCases: '1023 test cases',
  //     audits: '2 audits',
  //     tags: ['Paraphrase', 'Technical'],
  //     version: 'Ver. 1.2.1',
  //   },
  // ];

  const hasModels = models.length > 0;

  const metrics = [
    { label: 'Audit Runs', value: hasModels ? '16' : '--' },
    { label: 'Test Cases', value: hasModels ? '1250' : '--' },
    { label: 'Models Covered', value: hasModels ? '4' : '--' },
    { label: 'Issues Flagged', value: hasModels ? '45' : '--' },
  ];

  // Create column helper
  const columnHelper = createColumnHelper<Audit>();

  // Define columns
  const columns = [
    columnHelper.accessor('model', {
      header: () => (
        <div className="flex items-center gap-2">
          <img src="/images/icons/arrows-sort.png" alt="Sort" width={16} height={16} />
          <span>Model</span>
        </div>
      ),
      cell: (info) => (
        <Link 
          href={`/model/${info.getValue()}`} 
          className="audit-model-link"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('auditTime', {
      header: 'Audit Time',
    }),
    columnHelper.accessor('auditId', {
      header: 'Audit ID',
      cell: (info) => `ID #${info.getValue()}`,
    }),
    columnHelper.accessor('auditType', {
      header: 'Audit Type',
    }),
    columnHelper.accessor('testResult', {
      header: 'Test Result',
      cell: (info) => {
        return (
          <div className="flex items-center gap-2">
            <div className="test-result-bar">
              <div className="test-result-pass" />
              <div className="test-result-fail" />
            </div>
            <Text variant="bodySm">{info.getValue()} pa...</Text>
          </div>
        );
      },
    }),
    columnHelper.accessor('auditor', {
      header: 'Auditor',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <div className="auditor-avatar">
            {info.getValue()[0]}
          </div>
          <Text variant="bodySm">{info.getValue()}</Text>
        </div>
      ),
    }),
  ];

  // Define audit data
  const auditData: Audit[] = [
    {
      model: 'Region-al',
      auditTime: '25 / 06 / 2021',
      auditId: '12345',
      auditType: 'Technical',
      testResult: '120/240',
      auditor: 'Divya',
    },
    {
      model: 'LinguaFlow',
      auditTime: '25 / 06 / 2021',
      auditId: '12346',
      auditType: 'Technical',
      testResult: '120/240',
      auditor: 'Divya',
    },
    {
      model: 'Transcend',
      auditTime: '25 / 06 / 2021',
      auditId: '12347',
      auditType: 'Technical',
      testResult: '120/240',
      auditor: 'Divya',
    },
    {
      model: 'Mediscribe',
      auditTime: '25 / 06 / 2021',
      auditId: '12348',
      auditType: 'Technical',
      testResult: '120/240',
      auditor: 'Divya',
    },
    {
      model: 'Region-al',
      auditTime: '25 / 06 / 2021',
      auditId: '12349',
      auditType: 'Technical',
      testResult: '120/240',
      auditor: 'Divya',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <BreadCrumbs
        data={[
          { href: '/', label: 'Home' },
          { href: '/dashboard', label: 'User Dashboard' },
          { href: '#', label: 'AI Maker' },
        ]}
      />

      {/* Sidebar and Content Layout */}
      <div className="flex flex-1 gap-8 px-8 main-content-wrapper ai-maker-container">
        {/* Sidebar */}
        <WelcomeSection />

        {/* Main Content */}
        <div className="flex-1 bg-gray-50 p-10">
          {/* Header with Title */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-gray-900 overview-heading">Overview</h1>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-12 metrics-grid">
            {metrics.map((m) => (
              <div key={m.label} className="metric-card">
                <p className="metric-card-label">{m.label}</p>
                <p className="metric-card-value">{m.value}</p>
              </div>
            ))}
          </div>
          {/* Models Section */}
          <div className="section-margin-bottom">
            <div className="flex items-center justify-between section-title-margin">
              <Text variant="headingLg" as="h2" fontWeight="bold">Models</Text> 
              {hasModels && (
                <div className="add-model-button-wrapper">
                  <button className="add-model-button">
                    Add A New Model
                  </button>
                </div>
              )}
            </div>
            {hasModels ? (
              <div className="grid grid-cols-2 gap-6 models-grid">
                {models.map((model) => (
                  <div key={model.title} className="model-card">
                  <Text variant="headingMd" color="highlight" fontWeight="bold">{model.title}</Text>
                  
                  {/* Metadata */}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <img src="/images/icons/Frame 16.png" alt="Calendar" width={20} height={20} />
                      <Text variant="bodySm">{model.date}</Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src="/images/icons/tabler-icon-test-pipe.png" alt="Test Cases" width={20} height={20} />
                      <Text variant="bodySm">{model.testCases}</Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src="/images/icons/tabler-icon-discount-check.png" alt="Audits" width={20} height={20} />
                      <Text variant="bodySm">{model.audits}</Text>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <Text variant="bodyMd">{model.desc}</Text>
                  
                  {/* Tags */}
                  <div className="flex gap-2">
                    {model.tags.map((tag) => (
                      <Tag key={tag} variation="filled" fillColor="#E2F5C4" textColor="#000000">
                        {tag}
                      </Tag>
                    ))}
                  </div>
                  
                  {/* Version and Owner/Auditors */}
                  <div className="flex items-center justify-between">
                    <Text variant="bodySm" color="subdued">{model.version}</Text>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Text variant="bodySm" color="subdued">Owner:</Text>
                        <img src="/images/icons/Ellipse 4.png" alt="Owner" width={32} height={32} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Text variant="bodySm" color="subdued">Auditors:</Text>
                        <Avatar size="small" name="User 1" showInitials={true} />
                        <Avatar size="small" name="User 2" showInitials={true} />
                        <Text variant="bodySm" color="subdued">+3</Text>
                      </div>
                    </div>
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex justify-between items-center">
                    <Button kind="secondary" className="view-details-button">View Details</Button>
                    <button className="new-audit-button">
                      New Audit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ai-maker-empty-state">
              <div className="ai-maker-empty-icon">
                <img
                  src="/images/icons/mood-empty.png"
                  alt="No models"
                  width={70}
                  height={70}
                />
              </div>
              <Text as="p" className="ai-maker-empty-title">
                You have no registered AI models.
                <br />
                Register your first model to get started!
              </Text>
              <button className="add-model-button ai-maker-empty-button">
                Add A New Model
              </button>
            </div>
          )}
        </div>

          {/* Audits Table Section */}
          {hasModels && (
            <div className="audits-section">
              <div className="flex justify-between items-center mb-4">
                <Text variant="headingLg" as="h2">Last 10 Audits</Text>
                <a href="/audits" className="text-blue-600">See All</a>
              </div>
              <DataTable
                rows={auditData}
                columns={columns}
                hoverable={true}
                sortColumns={['model', 'auditTime']}
                defaultSortDirection="asc"
                hideSelection={true}
                hideFooter={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIMakerDashboard;