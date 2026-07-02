"use client";

import React from "react";
import ManualEvaluationFlow from "./manual-evaluation";
import type { SelectOption } from "./types";

interface ManualTestCasesProps {
  auditId?: string;
  modules: string[];
  moduleMetrics?: Record<string, SelectOption[]>;
  supportedLanguages?: string[];
  orgId: string;
  modelType?: string;
  auditScope?: string;
  onRunAudit: () => void;
  isRequestingAudit: boolean;
  onTestCaseCountChange?: (count: number) => void;
  onAuditStatusChange?: (status: string) => void;
}

const ManualTestCases: React.FC<ManualTestCasesProps> = ({
  auditId,
  modules,
  moduleMetrics,
  supportedLanguages,
  orgId,
  modelType = "TEXT_GENERATION",
  auditScope,
  onRunAudit,
  isRequestingAudit,
  onTestCaseCountChange,
  onAuditStatusChange,
}) => {
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
      moduleMetrics={moduleMetrics}
      modelType={modelType}
      domain={auditScope}
      supportedLanguages={supportedLanguages}
      orgId={orgId}
      onFinishAudit={onRunAudit}
      isRequestingAudit={isRequestingAudit}
      onTestCaseCountChange={onTestCaseCountChange}
      onAuditStatusChange={onAuditStatusChange}
    />
  );
};

export default ManualTestCases;
