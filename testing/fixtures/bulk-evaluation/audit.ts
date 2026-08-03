import type { Audit } from '@/features/dashboard/types/audit';

export function makeBulkAudit(overrides: Partial<Audit> = {}): Audit {
  return {
    auditType: 'TECHNICAL',
    evaluationMode: 'BULK',
    id: 'audit-1',
    name: 'Bulk Evaluation 1',
    modelId: 'model-1',
    modelName: 'Test Model',
    status: 'PENDING_REVIEW',
    modules: ['BIAS_FAIRNESS'],
    metrics: ['gender_bias'],
    configuration: {},
    totalTests: 10,
    passedTests: 8,
    failedTests: 2,
    skippedTests: 0,
    errorMessage: null,
    errorDetails: null,
    createdAt: '2026-01-01T00:00:00Z',
    startedAt: '2026-01-01T00:00:00Z',
    completedAt: null,
    ...overrides,
  };
}
