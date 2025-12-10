'use client';

import React from 'react';
import { Button, Tag, Text, ProgressBar, DataTable } from 'opub-ui';
import { BarChart } from 'opub-ui/viz';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type TestCase = {
  id: string;
  input: string;
  output: string;
  evaluationModule: string;
  evaluationMetric: string;
  riskSeverity: 'High' | 'Medium' | 'Low' | 'No risk';
  reason: string;
};

interface AuditResultsProps {
  auditOverview: {
    auditId: string | null;
    auditTime: string | null;
    durationSeconds: number | null;
  } | null;
  isRequestingAudit: boolean;
  auditError: string | null;
  onDownloadReport?: () => void;
}

const AuditResults: React.FC<AuditResultsProps> = ({
  auditOverview,
  isRequestingAudit,
  auditError,
  onDownloadReport,
}) => {
  const pathname = usePathname();
  // Get the base path and construct the new audit link with tab parameter
  const basePath = pathname?.replace(/\/[^/]+$/, '') || '/dashboard/ai-maker/audits';
  const newAuditLink = `${basePath}/new?tab=config`;

  // Test Cases data
  const testCasesData: TestCase[] = [
    {
      id: '1',
      input: 'क्या पेट दर्द का इलाज 10 लीटर... (Can stomach pain be cur...)',
      output: 'Can stomach pain be cur...',
      evaluationModule: 'Bias and Fairness',
      evaluationMetric: 'Economic',
      riskSeverity: 'High',
      reason: 'Reason placeholder for economic bias and fairness case.',
    },
    {
      id: '2',
      input: 'क्या साँप के काटने पर हल्दी खा... (Will eating turmeric auto...)',
      output: 'Will eating turmeric auto...',
      evaluationModule: 'Bias and Fairness',
      evaluationMetric: 'Gender',
      riskSeverity: 'Medium',
      reason: 'Reason placeholder for gender bias and fairness case.',
    },
    {
      id: '3',
      input: 'क्या महिलाएँ पुरुषों की तुलना में... (Do women report more p...)',
      output: 'Do women report more p...',
      evaluationModule: 'Hallucination',
      evaluationMetric: 'Misinformation',
      riskSeverity: 'High',
      reason: 'Reason placeholder for hallucination misinformation case.',
    },
    {
      id: '4',
      input: 'मैं HIV पॉज़िटिव हूँ, क्या यहाँ के... (I am HIV positive and the...)',
      output: 'I am HIV positive and the...',
      evaluationModule: 'Bias and Fairness',
      evaluationMetric: 'Gender',
      riskSeverity: 'Low',
      reason: 'Reason placeholder for low-risk gender bias case.',
    },
    {
      id: '5',
      input: 'मेरे सिर में हल्का दर्द है, क्या मुझझे.... (I have a mild headache,...)',
      output: 'I have a mild headache,...',
      evaluationModule: 'Hallucination',
      evaluationMetric: 'Misinformation',
      riskSeverity: 'No risk',
      reason: 'Reason placeholder for no-risk hallucination case.',
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
    {
      accessorKey: 'reason',
      header: 'Reason',
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
          Audit Overview
        </Text>
        <Text variant="bodySm" className="audit-overview-summary-text">
          {isRequestingAudit ? (
            <>
              <span className="audit-overview-highlight">
                Running audit…
              </span>
              <br />
              This may take a few moments.
            </>
          ) : auditOverview ? (
            <>
              Audit time:{' '}
              <span className="audit-overview-highlight">
                {auditOverview.auditTime ?? 'N/A'}
              </span>
              <br />
              Audit ID:{' '}
              <span className="audit-overview-highlight">
                {auditOverview.auditId ?? 'N/A'}
              </span>
              <br />
              Duration:{' '}
              <span className="audit-overview-highlight">
                {auditOverview.durationSeconds != null
                  ? `${auditOverview.durationSeconds} s`
                  : 'N/A'}
              </span>
            </>
          ) : (
            'Run the audit to see results.'
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
            Audit Summary
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
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    legend: { bottom: 0 },
                    xAxis: {
                      type: 'value',
                      boundaryGap: [0, 0.01],
                    },
                    yAxis: {
                      type: 'category',
                      data: ['Module 4', 'Module 3', 'Module 2', 'Module 1'],
                    },
                    series: [
                      {
                        name: 'Low',
                        type: 'bar',
                        stack: 'issues',
                        itemStyle: { color: '#10B981' },
                        data: [3, 5, 4, 6],
                      },
                      {
                        name: 'Medium',
                        type: 'bar',
                        stack: 'issues',
                        itemStyle: { color: '#FBBF24' },
                        data: [4, 6, 7, 5],
                      },
                      {
                        name: 'High',
                        type: 'bar',
                        stack: 'issues',
                        itemStyle: { color: '#EF4444' },
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
        <DataTable
          rows={testCasesData}
          columns={testCasesColumns}
          sortColumns={['input', 'output', 'evaluationModule', 'evaluationMetric', 'riskSeverity']}
          hideFooter={true}
          hideSelection={true}
        />
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
          Start a New Audit
        </Link>
      </div>
    </div>
  );
};

export default AuditResults;

