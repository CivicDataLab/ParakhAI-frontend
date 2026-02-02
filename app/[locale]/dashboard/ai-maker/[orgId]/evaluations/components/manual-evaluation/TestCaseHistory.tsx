'use client';

import { Tag, Text } from 'opub-ui';
import React from 'react';
import type { ManualTestCase } from './types';

interface TestCaseHistoryProps {
  testCases: ManualTestCase[];
  moduleName: string;
  moduleDisplayName: string;
}

const TestCaseHistory: React.FC<TestCaseHistoryProps> = ({
  testCases,
  moduleName,
  moduleDisplayName,
}) => {
  const moduleTestCases = testCases.filter((tc) => tc.module === moduleName);

  if (moduleTestCases.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <Text variant="headingMd" className="mb-4">
        Test Cases for {moduleDisplayName}
      </Text>

      <div className="space-y-3">
        {moduleTestCases.map((tc, index) => (
          <div
            key={tc.id}
            className={`p-4 rounded-lg border ${
              tc.status === 'PASSED'
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <Text variant="bodySm" fontWeight="medium">
                Test Case #{index + 1}
              </Text>
              <Tag
                variation="filled"
                fillColor={tc.status === 'PASSED' ? '#BBF7D0' : '#FECACA'}
                textColor={tc.status === 'PASSED' ? '#15803D' : '#DC2626'}
              >
                {tc.status}
              </Tag>
            </div>

            <div className="space-y-2">
              <div>
                <Text variant="bodySm" className="text-gray-500">
                  Input:
                </Text>
                <Text variant="bodySm" className="line-clamp-2">
                  {tc.inputPrompt}
                </Text>
              </div>

              <div>
                <Text variant="bodySm" className="text-gray-500">
                  Output:
                </Text>
                <Text variant="bodySm" className="line-clamp-2">
                  {tc.modelOutput}
                </Text>
              </div>

              {tc.status === 'FAILED' && tc.issueType && (
                <div className="flex gap-4 text-xs mt-2">
                  <span className="text-red-600">Issue: {tc.issueType}</span>
                  {tc.severity && (
                    <span className="text-orange-600">Severity: {tc.severity}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestCaseHistory;
