'use client';

import { Tag, Text } from 'opub-ui';
import React, { useState } from 'react';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ManualTestCase, SubModuleInfo } from './types';
import { toTitleCase } from '@/lib/utils';
import { resolveIssueDisplayName } from './utils';

interface TestCaseHistoryProps {
  testCases: ManualTestCase[];
  moduleName: string;
  moduleDisplayName: string;
  subModules?: SubModuleInfo[];
}

const TestCaseHistory: React.FC<TestCaseHistoryProps> = ({
  testCases,
  moduleName,
  moduleDisplayName,
  subModules = [],
}) => {
  // Order by submission time so "Test Case N" matches the sequence shown during entry
  // (API may return newest-first; labels use array index only).
  const moduleTestCases = testCases
    .filter((tc) => tc.module === moduleName)
    .sort((a, b) => {
      const byTime =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (byTime !== 0) return byTime;
      return a.id.localeCompare(b.id);
    });
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  if (moduleTestCases.length === 0) {
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
        {moduleTestCases.map((tc, index) => {
          const isExpanded = expandedCards.has(tc.id);
          const issueKey = tc.issueType || tc.subModule;
          const issueDisplayName = resolveIssueDisplayName(
            issueKey,
            subModules,
            moduleName
          );
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
                  <Tag
                    variation="filled"
                    fillColor={
                      tc.status === 'PASSED'
                        ? '#BBF7D0'
                        : tc.severity === 'HIGH'
                          ? '#E93D82'
                          : tc.severity === 'MEDIUM'
                            ? '#F5D08C'
                            : tc.severity === 'LOW'
                              ? '#5EB0EF'
                              : '#FECACA'
                    }
                    textColor={
                      tc.status === 'PASSED'
                        ? '#15803D'
                        : tc.severity === 'HIGH'
                          ? '#FFFFFF'
                          : tc.severity === 'MEDIUM'
                            ? '#0A0704'
                            : tc.severity === 'LOW'
                              ? '#FFFFFF'
                              : '#DC2626'
                    }
                  >
                    {tc.status === 'FAILED' && tc.severity && issueKey
                      ? `${tc.severity.charAt(0) + tc.severity.slice(1).toLowerCase()} risk - ${issueDisplayName}`
                      : toTitleCase(tc.status.toLowerCase())}
                  </Tag>
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
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{tc.inputPrompt || ''}</ReactMarkdown>
                    </div>
                  </div>

                  <div>
                    <Text variant="bodySm" fontWeight="medium" className="mb-2 block">
                      Output
                    </Text>
                    <div className="prose prose-sm max-w-none break-words text-gray-900">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{tc.modelOutput || ''}</ReactMarkdown>
                    </div>
                  </div>

                  {tc.comments && (
                    <div>
                      <Text variant="bodySm" fontWeight="medium" className="mb-2 block">
                        Comments
                      </Text>
                      <div className="prose prose-sm max-w-none break-words text-gray-900">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{tc.comments}</ReactMarkdown>
                      </div>
                    </div>
                  )}
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
