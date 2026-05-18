export const GET_EVALUATION_STATUS_QUERY = `
  query ManualEvaluationStatus($auditId: ID!) {
    manualEvaluationStatus(auditId: $auditId) {
      auditId
      totalModules
      completedModules
      allModulesComplete
      canFinishEvaluation
      moduleProgress {
        module
        moduleDisplayName
        testCaseCount
        isComplete
        canComplete
        passedCount
        failedCount
      }
    }
  }
`;

export const GET_TEST_CASES_QUERY = `
  query ManualTestCases($auditId: ID!, $module: String) {
    manualTestCases(auditId: $auditId, module: $module) {
      id
      module
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
