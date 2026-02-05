'use client';

import { Tag, Text } from 'opub-ui';
import React, { useState } from 'react';
import { IconMinus, IconPlus } from '@tabler/icons-react';
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
  <div className="mt-6">
      <Text variant="headingMd" className="mb-4">
        Previous Test Cases for {moduleDisplayName}
      </Text>

      <div className="flex flex-col gap-5">
        {moduleTestCases.map((tc, index) => {
          const isExpanded = expandedCards.has(tc.id);
          return (
            <div
              key={tc.id}
              className="test-case-card-border bg-white p-6 mt-2"
            >
              <button
                onClick={() => toggleCard(tc.id)}
                className="w-full flex items-center justify-between text-left mb-0 border-none outline-none bg-transparent"
              >
                <div className="flex items-center gap-3">
                  <Text variant="bodyMd" fontWeight="medium">
                    Test Case {index + 1}
                  </Text>
                  <Tag
                    variation="filled"
                    fillColor={tc.status === 'PASSED' ? '#BBF7D0' : '#FECACA'}
                    textColor={tc.status === 'PASSED' ? '#15803D' : '#DC2626'}
                  >
                    {tc.status === 'FAILED' && tc.severity && tc.issueType
                      ? `${tc.severity.charAt(0) + tc.severity.slice(1).toLowerCase()} risk - ${tc.issueType}`
                      : tc.status}
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
                    <Text variant="bodySm">{tc.inputPrompt}</Text>
                  </div>

                  <div>
                    <Text variant="bodySm" fontWeight="medium" className="mb-2 block">
                      Output
                    </Text>
                    <Text variant="bodySm">{tc.modelOutput}</Text>
                  </div>

                  {tc.comments && (
                    <div>
                      <Text variant="bodySm" fontWeight="medium" className="mb-2 block">
                        Comments
                      </Text>
                      <Text variant="bodySm">{tc.comments}</Text>
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
