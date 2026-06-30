// Re-export bulk-evaluation queries so the hook only imports from one place
export {
  GET_AUDIT_RESULTS_QUERY,
  SUBMIT_AUDIT_REVIEW_MUTATION,
} from "@/features/ai-maker/api/bulk-evaluation-queries";

export const GET_AUDIT_QUERY = `
  query GetAudit($auditId: ID!) {
    audit(auditId: $auditId) {
      id
      name
      modelId
      modelName
      modelVersionId
      modelSnapshot
      status
      modules
      auditScope
      auditObjective
      metrics
      configuration
      evaluationMode
      auditType
      totalTests
      passedTests
      failedTests
      skippedTests
      errorMessage
      errorDetails
      createdAt
      startedAt
      completedAt
      progressPercentage
    }
  }
`;

export const GET_AUDIT_SUMMARY = `
  query GetSummaries($audit_id: ID!) {
    auditSummaries(auditId: $audit_id) {
      id
      audit {
        pk
      }
      status
      totalTests
      totalTasks
      totalResults
      aggregationMethod
      riskDistribution
      moduleSummary
      metricSummary
      toolSummary
      overallVerdict
      verdictReason
      recommendations
      auditorComments
      executiveSummary
      createdAt
      updatedAt
      hasReport
      auditReport {
        name
        size
        url
      }
    }
  }
`;

export const UPDATE_AUDIT_MUTATION = `
  mutation UpdateAudit($input: UpdateAuditInput!) {
    updateAudit(input: $input) {
      success
      message
      audit {
        id
        name
        status
        modules
        metrics
        modelId
        modelVersionId
        testDatasetIds
        configuration
      }
    }
  }
`;

export const GENERATE_AUDIT_REPORT_QUERY = `
  query GenerateAuditReport($auditId: ID!) {
    generateAuditReport(auditId: $auditId) {
      success
      message
    }
  }
`;
