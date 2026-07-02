/** All GraphQL query/mutation strings for the Auditor feature. */

export const GET_AUDITOR_METRICS = `
  query AuditorMetrics {
    auditorMetrics {
      assignmentsCount
      assignmentsAccepted
      assignmentsDeclined
      assignmentsPending
      assignmentsCompleted
      auditsDone
      testCasesCount
      failedTestCasesCount
    }
  }
`;

export const GET_MY_ASSIGNMENTS = `
  query GetMyAssignments($modelId: String, $status: String) {
    myAssignments(modelId: $modelId, status: $status) {
      id
      organizationId
      organizationName
      modelId
      modelName
      modelVersionId
      auditorId
      auditorEmail
      auditorUsername
      status
      notes
      createdAt
      updatedAt
    }
  }
`;

export const GET_MY_EVALUATIONS = `
  query GetMyEvaluations($limit: Int, $offset: Int) {
    myAudits(limit: $limit, offset: $offset) {
      data {
        id
        name
        modelId
        modelName
        status
        evaluationMode
        auditType
        totalTests
        passedTests
        failedTests
        createdAt
        completedAt
      }
      totalItemsCount
    }
  }
`;

export const GET_MY_ASSIGNMENTS_FOR_MODEL = `
  query GetMyAssignmentsForModel($modelId: String!) {
    myAssignments(modelId: $modelId) {
      id
      organizationId
      organizationName
      modelId
      modelName
      status
      notes
      createdAt
      updatedAt
    }
  }
`;

export const GET_ORGANIZATION = `
  query GetOrganization($orgId: ID!) {
    organization(id: $orgId) {
      id
      name
      logoUrl
      slug
    }
  }
`;

export const GET_AI_MODEL_QUERY = `
  query GetAIModelForAuditor($modelId: ID!) {
    aiModel(id: $modelId) {
      id
      name
      displayName
      description
      version
      modelType
      lifecycleStage
      auditsCount
      testCasesCount
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ASSIGNMENT_STATUS = `
  mutation UpdateAuditorAssignmentStatus($assignmentId: ID!, $status: String!) {
    updateAuditorAssignmentStatus(assignmentId: $assignmentId, status: $status) {
      success
      message
      assignment {
        id
        status
        notes
        updatedAt
      }
    }
  }
`;

export const GET_MY_ASSIGNMENTS_FOR_NEW_EVAL = `
  query GetMyAssignmentsForNewEval {
    myAssignments(status: "ACCEPTED") {
      id
      organizationId
      organizationName
      modelId
      modelName
      status
    }
  }
`;
