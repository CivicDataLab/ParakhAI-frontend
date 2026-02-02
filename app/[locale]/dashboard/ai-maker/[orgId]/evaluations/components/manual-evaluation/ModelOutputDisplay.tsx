'use client';

import { Button, Tag, Text } from 'opub-ui';
import React from 'react';

interface ModelOutputDisplayProps {
  output: string;
  latencyMs?: number;
  status: 'PASSED' | 'FAILED' | null;
  onStatusChange: (status: 'PASSED' | 'FAILED') => void;
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

      <div className="border border-gray-200 rounded-lg p-4 bg-white min-h-[120px] max-h-[300px] overflow-y-auto">
        <Text variant="bodySm" className="whitespace-pre-wrap">
          {output || 'No output received'}
        </Text>
      </div>

      <div className="flex items-center gap-4">
        <Text variant="bodyMd" fontWeight="medium">
          Evaluation:
        </Text>
        <div className="flex gap-3">
          <Button
            kind="secondary"
            onClick={() => onStatusChange('PASSED')}
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
            onClick={() => onStatusChange('FAILED')}
            className={
              status === 'FAILED'
                ? 'border-2 border-red-600 bg-red-50 text-red-700'
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
