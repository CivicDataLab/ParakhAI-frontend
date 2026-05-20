"use client";

import React from "react";
import ManualEvaluationFlow from "./manual-evaluation";

interface ManualTestCasesProps {
  auditId?: string;
  modules: string[];
  modelType?: string;
  supportedLanguages?: string[];
  orgId: string;
  onRunAudit: () => void;
  isRequestingAudit: boolean;
  onTestCaseCountChange?: (count: number) => void;
}

const ManualTestCases: React.FC<ManualTestCasesProps> = ({
  auditId,
  modules,
  modelType = "LLM",
  supportedLanguages,
  orgId,
  onRunAudit,
  isRequestingAudit,
  onTestCaseCountChange,
}) => {
  // If no auditId yet, show a message to create the audit first
  if (!auditId) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">
          Please complete the configuration and create the audit to begin manual
          evaluation.
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
      onFinishAudit={onRunAudit}
      isRequestingAudit={isRequestingAudit}
      onTestCaseCountChange={onTestCaseCountChange}
    />
  );
};

export default ManualTestCases;
