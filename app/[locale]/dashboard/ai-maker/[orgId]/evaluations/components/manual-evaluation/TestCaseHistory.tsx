'use client';

import { Tag, Text } from 'opub-ui';
import React, { useState } from 'react';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ManualTestCase, SubModuleInfo } from './types';
import { resolveIssueDisplayName } from './utils';

interface TestCaseHistoryProps {
  testCases: ManualTestCase[];
  moduleName: string;
  moduleDisplayName: string;
  subModules?: SubModuleInfo[];
}

const TestCaseHistory: React.FC<TestCaseHistoryProps> = ({
  testCases,
  moduleDisplayName,
  subModules = [],
}) => {
  const sortedTestCases = [...testCases].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      const byTime =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (byTime !== 0) return byTime;
    }
    return a.id.localeCompare(b.id);
  });

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  if (sortedTestCases.length === 0) {
    return null;
  }

  const toggleCard = (testCaseId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(testCaseId)) {
        newSet.delete(testCaseId);
      } else {
        newSet.add(testCaseId);
      }
      return newSet;
    });
  };

  return (
    <div>
      <Text variant="headingMd" className="mb-4">
        Previous Test Cases for {moduleDisplayName}
      </Text>

      <div className="flex flex-col gap-5">
        {sortedTestCases.map((tc, index) => {
          const isExpanded = expandedCards.has(tc.id);
          const isPassed = tc.issues.length === 0;

          return (
            <div
              key={tc.id}
              className="test-case-card-border bg-white p-6 mt-2"
            >
              <button
                onClick={() => toggleCard(tc.id)}
                className="w-full flex items-center justify-between text-left mb-0 border-none outline-none bg-transparent p-0"
              >
                <div className="flex items-center gap-3">
                  <Text variant="bodyMd" fontWeight="medium">
                    Test Case {index + 1}
                  </Text>
                  {isPassed ? (
                    <Tag variation="filled" fillColor="#BBF7D0" textColor="#15803D">
                      Passed
                    </Tag>
                  ) : (
                    tc.issues.map((issue, i) => {
                      const issueLabel = resolveIssueDisplayName(issue.metricName, subModules);
                      return (
                        <Tag
                          key={i}
                          variation="filled"
                          fillColor={
                            issue.severity === 'HIGH'
                              ? '#E93D82'
                              : issue.severity === 'MEDIUM'
                                ? '#F5D08C'
                                : '#5EB0EF'
                          }
                          textColor={
                            issue.severity === 'HIGH'
                              ? '#FFFFFF'
                              : issue.severity === 'MEDIUM'
                                ? '#0A0704'
                                : '#FFFFFF'
                          }
                        >
                          {`${issue.severity.charAt(0) + issue.severity.slice(1).toLowerCase()} risk - ${issueLabel}`}
                        </Tag>
                      );
                    })
                  )}
                </div>
                {isExpanded ? (
                  <IconMinus className="text-gray-600" size={20} />
                ) : (
                  <IconPlus className="text-gray-600" size={20} />
                )}
              </button>

              {isExpanded && (
                <div className="mt-5 space-y-4">
                  <div>
                    <Text variant="bodySm" fontWeight="medium" className="mb-2 block">
                      Input
                    </Text>
                    <div className="prose prose-sm max-w-none break-words text-gray-900">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{tc.testInput}</ReactMarkdown>
                    </div>
                  </div>

                  <div>
                    <Text variant="bodySm" fontWeight="medium" className="mb-2 block">
                      Output
                    </Text>
                    <div className="prose prose-sm max-w-none break-words text-gray-900">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{tc.actualOutput}</ReactMarkdown>
                    </div>
                  </div>

                  {tc.issues.map((issue, i) => issue.comments ? (
                    <div key={i}>
                      <Text variant="bodySm" fontWeight="medium" className="mb-2 block">
                        {tc.issues.length > 1 ? `Issue ${i + 1} Comments` : 'Comments'}
                      </Text>
                      <div className="prose prose-sm max-w-none break-words text-gray-900">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{issue.comments}</ReactMarkdown>
                      </div>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TestCaseHistory;
