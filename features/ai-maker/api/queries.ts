/** All GraphQL query/mutation strings for the AI Maker feature. */

export const GET_MY_ORGANIZATIONS = `
  query GetMyOrganizations {
    myOrganizations {
      id
      name
      slug
      description
      logoUrl
    }
  }
`;

export const GET_ORG_DETAILS = `
  query GetOrgDetails($orgId: ID!) {
    organization(id: $orgId) {
      id
      name
      logoUrl
      slug
    }
  }
`;

export const GET_AI_MODELS = `
  query GetAIModels($limit: Int) {
    aiModels(limit: $limit) {
      id
      name
      displayName
      version
      description
      auditsCount
      testCasesCount
      createdAt
      updatedAt
      modelType
    }
  }
`;

export const GET_AI_MODEL = `
  query GetAIModel($modelId: ID!) {
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

export const GET_EVALUATIONS = `
  query GetAudits($limit: Int, $offset: Int) {
    audits(limit: $limit, offset: $offset, filters: null, sortOptions: null) {
      data {
        id
        name
        modelId
        modelName
        status
        modules
        metrics
        evaluationMode
        auditType
        totalTests
        passedTests
        failedTests
        createdAt
        startedAt
        completedAt
      }
      totalItemsCount
    }
  }
`;

export const GET_AUDIT_QUERY = `
  query GetAudit($auditId: ID!) {
    audit(id: $auditId) {
      id
      name
      status
      auditType
      evaluationMode
      modelId
      modelName
      modules
      metrics
      totalTests
      passedTests
      failedTests
      skippedTests
      createdAt
      startedAt
      completedAt
    }
  }
`;

export const GET_AUDIT_SUMMARY = `
  query GetAuditSummary($auditId: ID!) {
    auditSummary(auditId: $auditId) {
      totalTests
      passedTests
      failedTests
      skippedTests
      successRate
    }
  }
`;

export const AUDIT_METRICS_QUERY = `
  query AuditMetrics {
    auditMetrics {
      evaluationRuns
      testCasesCount
      models
      issuesFlagged
    }
  }
`;

export const GET_ORGANIZATION_AUDITORS = `
  query GetOrganizationAuditors($orgId: ID!) {
    organizationAuditors(orgId: $orgId) {
      id
      username
      email
      status
    }
  }
`;

export const GET_AUDITOR_ASSIGNMENTS = `
  query GetAuditorAssignments($orgId: ID!) {
    auditorAssignments(orgId: $orgId) {
      id
      auditorId
      auditorEmail
      auditorUsername
      modelId
      modelName
      status
      createdAt
    }
  }
`;

export const CREATE_BLANK_AUDIT_MUTATION = `
  mutation CreateBlankAudit($input: CreateAuditInput!) {
    createAudit(input: $input) {
      id
      name
      status
      auditType
      evaluationMode
    }
  }
`;

export const UPDATE_AUDIT_MUTATION = `
  mutation UpdateAudit($input: UpdateAuditInput!) {
    updateAudit(input: $input) {
      id
      name
      status
    }
  }
`;

export const ADD_AUDITOR_MUTATION = `
  mutation AddAuditor($input: AddAuditorInput!) {
    addAuditor(input: $input) {
      success
      message
    }
  }
`;

export const REMOVE_AUDITOR_MUTATION = `
  mutation RemoveAuditor($input: RemoveAuditorInput!) {
    removeAuditor(input: $input) {
      success
      message
    }
  }
`;
