export const METRICS_BY_MODEL_TYPE_QUERY = `
  query MetricsByModelType($modelType: String!) {
    metricsByModelType(modelType: $modelType) {
      name
      displayName
      description
      metrics {
        name
        displayName
        description
      }
    }
  }
`;

export const GET_PLAYGROUND_STATUS_QUERY = `
  query PlaygroundEvaluationStatus($auditId: ID!) {
    playgroundEvaluationStatus(auditId: $auditId) {
      auditId
      testCaseCount
      canFinish
    }
  }
`;

export const GET_TEST_CASES_QUERY = `
  query ManualTestCases($auditId: ID!) {
    manualTestCases(auditId: $auditId) {
      id
      subModule
      sourceLanguage
      targetLanguage
      inputPrompt
      modelOutput
      status
      issueType
      severity
      comments
      idealOutput
      createdAt
    }
  }
`;
