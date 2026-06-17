export const UPDATE_AUDIT_RESULT_MUTATION = `
  mutation UpdateAuditResult($input: UpdateAuditResultInput!) {
    updateAuditResult(input: $input) {
      success
      message
    }
  }
`;

export const SUBMIT_AUDIT_REVIEW_MUTATION = `
  mutation SubmitAuditReview($input: SubmitAuditReviewInput!) {
    submitAuditReview(input: $input) {
      success
      message
      audit {
        id
        status
        completedAt
      }
    }
  }
`;


export const GET_AUDIT_RESULTS_QUERY = `
  query GetAuditResults($auditId: ID!, $metric: String) {
    auditResults(auditId: $auditId, metric: $metric) {
      id
      task {
        test {
          id
          testInput
          actualOutput
        }
        errorMessage
      }
      name
      success
      riskLevel
      reason
      issueDescription
      evaluatorSuccess
      evaluatorRiskLevel
      evaluatorReason
      isReviewed
    }
  }
`;
