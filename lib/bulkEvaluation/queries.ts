export const GET_AUDIT_RESULTS_QUERY = `
  query GetAuditResults($auditId: ID!, $metric: String) {
    auditResults(auditId: $auditId, metric: $metric) {
      id
      task {
        id
        audit {
          pk
        }
        test {
          id
          audit {
            pk
          }
          testInput
          expectedOutput
          actualOutput
          context
          retrievalContext
          toolsCalled
          expectedTools
          createdAt
          startedAt
          completedAt
          comments
          module
          subModule
          severity
          isManual
        }
        status
        startedAt
        completedAt
        errorMessage
        metric
        module
        domain
        metricDisplayName
        moduleDisplayName
      }
      name
      success
      score
      riskLevel
      reason
      issueDescription
      evaluatorSuccess
      evaluatorRiskLevel
      evaluatorReason
      isReviewed
      reviewedAt
      metadata
      createdAt
    }
  }
`;
