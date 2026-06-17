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
  query ManualTestCases($auditId: ID!, $module: String) {
    manualTestCases(auditId: $auditId, module: $module) {
      id
      testInput
      actualOutput
      createdAt
      issues {
        metricName
        status
        severity
        comments
        idealOutput
      }
    }
  }
`;

export const SUBMIT_TEST_CASE_MUTATION = `
  mutation SubmitManualTestCase($input: SubmitManualTestCaseInput!) {
    submitManualTestCase(input: $input) {
      success
      message
      testCase {
        id
      }
      testCaseCount
    }
  }
`;

export const FINISH_EVALUATION_MUTATION = `
  mutation FinishManualEvaluation($input: FinishManualEvaluationInput!) {
    finishManualEvaluation(input: $input) {
      success
      message
      auditId
    }
  }
`;
