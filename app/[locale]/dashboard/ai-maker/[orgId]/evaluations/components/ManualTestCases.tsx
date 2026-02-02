'use client';

import React from 'react';
import ManualEvaluationFlow from './manual-evaluation';

interface ManualTestCasesProps {
  auditId?: string;
  modules: string[];
  modelType?: string;
  supportedLanguages?: string[];
  orgId: string;
  onPrevious: () => void;
  onRunAudit: () => void;
  isRequestingAudit: boolean;
}

const ManualTestCases: React.FC<ManualTestCasesProps> = ({
  auditId,
  modules,
  modelType = 'LLM',
  supportedLanguages,
  orgId,
  onPrevious,
  onRunAudit,
  isRequestingAudit,
}) => {
  // If no auditId yet, show a message to create the audit first
  if (!auditId) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">
          Please complete the configuration and create the audit to begin manual evaluation.
        </p>
      </div>
    );
  }

  return (
    <ManualEvaluationFlow
      auditId={auditId}
      modules={modules}
      modelType={modelType}
      supportedLanguages={supportedLanguages}
      orgId={orgId}
      onPrevious={onPrevious}
      onFinishAudit={onRunAudit}
      isRequestingAudit={isRequestingAudit}
    />
  );
};

export default ManualTestCases;


