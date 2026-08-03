'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, Tag, Text } from 'opub-ui';
import remarkGfm from 'remark-gfm';
import { TEST_CASE_STATUS, type TestCaseStatus } from '@/constants';

interface ModelOutputDisplayProps {
  output: string;
  latencyMs?: number;
  status: TestCaseStatus | null;
  onStatusChange: (status: TestCaseStatus) => void;
}

const ModelOutputDisplay: React.FC<ModelOutputDisplayProps> = ({
  output,
  latencyMs,
  status,
  onStatusChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Text variant="bodyMd" fontWeight="medium">
          Model Output
        </Text>
        {latencyMs && (
          <Tag variation="outlined" textColor="#6B7280" borderColor="#D1D5DB">
            {latencyMs.toFixed(0)}ms
          </Tag>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg max-h-[300px] min-h-[120px] overflow-y-auto bg-white p-4">
        {output ? (
          <div className="bulk-evaluation-sheet-prose text-gray-900 prose prose-sm max-w-none break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
          </div>
        ) : (
          <Text variant="bodySm" className="text-gray-400">
            No output received
          </Text>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Text variant="bodyMd" fontWeight="medium">
          Evaluation:
        </Text>
        <div className="flex gap-3">
          <Button
            kind="secondary"
            onClick={() => onStatusChange(TEST_CASE_STATUS.PASSED)}
            className={
              status === TEST_CASE_STATUS.PASSED
                ? 'border-green-600 bg-green-50 text-green-700 border-2'
                : ''
            }
          >
            ✓ Passed
          </Button>
          <Button
            kind="secondary"
            onClick={() => onStatusChange(TEST_CASE_STATUS.FAILED)}
            className={
              status === TEST_CASE_STATUS.FAILED
                ? 'border-red-600 bg-red-50 text-red-700 border-2'
                : ''
            }
          >
            ✕ Failed
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModelOutputDisplay;
