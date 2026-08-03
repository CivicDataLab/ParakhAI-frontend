export type RiskDistribution = Record<string, number>;

export type Audit = {
  auditType: string;
  evaluationMode: string;
  auditScope?: string | null;
  auditObjective?: string | null;
  modelVersionId?: number | null;
  modelSnapshot?: any;
  id: string;
  name: string;
  modelId: string;
  modelName: string | null;
  status: string;
  modules: string[];
  metrics: string[];
  configuration: any;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  errorMessage: string | null;
  errorDetails: any;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  progressPercentage?: number | null;
};

export type TestCase = {
  id: string;
  input: string;
  output: string;
  evaluationModule: string;
  evaluationMetric: string;
  riskSeverity: "High" | "Medium" | "Low" | "No risk";
  reason: string;
};

export type EvaluationDetailProps = {
  evaluationId: string;
  backLink: string;
  backLinkText?: string;
  orgId?: string;
};
