export const METRICS_BY_MODEL_TYPE_QUERY = `
  query MetricsByModelType($modelType: String!, $domain: String!) {
    metricsByModelType(modelType: $modelType, domain: $domain) {
      name
      displayName
      description
      metrics {
        name
        displayName
        description
        mandatoryInputs
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
      auditStatus
    }
  }
`;

export const GET_TEST_CASES_QUERY = `
  query ManualTestCases($auditId: ID!, $module: String) {
    manualTestCases(auditId: $auditId, module: $module) {
      test {
        id
        testInput
        actualOutput
        createdAt
      }
      result {
        name
        success
        riskLevel
        reason
        idealOutput
        evaluatorSuccess
        evaluatorRiskLevel
        evaluatorReason
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
        test {
          id
        }
      }
      testCaseCount
    }
  }
`;

export const GENERATE_PLAYGROUND_REASON_MUTATION = `
  mutation GeneratePlaygroundReason($input: GenerateReasonInput!) {
    generatePlaygroundReason(input: $input) {
      success
      message
      reason
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
