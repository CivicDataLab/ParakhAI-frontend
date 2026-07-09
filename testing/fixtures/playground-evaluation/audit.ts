import type { Audit } from '@/features/dashboard/types/audit';

export function makePlaygroundAudit(overrides: Partial<Audit> = {}): Audit {
  return {
    auditType: 'TECHNICAL',
    evaluationMode: 'PLAYGROUND',
    id: 'playground-audit-1',
    name: 'Playground Evaluation 1',
    modelId: 'model-1',
    modelName: 'Test Model',
    status: 'IN_PROGRESS',
    modules: ['BIAS_FAIRNESS'],
    metrics: ['GENDER_BIAS'],
    configuration: {},
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    errorMessage: null,
    errorDetails: null,
    createdAt: '2026-01-01T00:00:00Z',
    startedAt: '2026-01-01T00:00:00Z',
    completedAt: null,
    progressPercentage: 0,
    ...overrides,
  };
}
