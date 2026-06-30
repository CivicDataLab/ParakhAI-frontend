"use client";

import { Text } from "opub-ui";

type RiskSummary = {
  low: number;
  medium: number;
  high: number;
};

type EvaluationSummaryCardProps = {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  riskSummary: RiskSummary;
  passRate: number | string;
  passRateColor?: "success" | "warning" | "default" | undefined;
};

const EvaluationSummaryCard = ({
  totalTests,
  passedTests,
  failedTests,
  skippedTests,
  riskSummary,
  passRate,
  passRateColor,
}: EvaluationSummaryCardProps) => {
  const totalIssues = riskSummary.low + riskSummary.medium + riskSummary.high;

  return (
    <div className="mb-8 rounded-2xl border border-[#C4B8F3]">
      <div className="mb-4 sm:mb-5 pl-2">
        <Text variant="headingMd" fontWeight="bold">
          Evaluation Summary
        </Text>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 md:gap-8">
        <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
          <Text
            variant="headingSm"
            fontWeight="semibold"
            color="onBgDisabled"
            className="text-gray-400 text-xs sm:text-sm"
          >
            TOTAL PASS RATE
          </Text>
          <Text
            variant="headingLg"
            fontWeight="bold"
            color={passRateColor}
            className="text-green-600 text-xl sm:text-2xl"
          >
            {passRate || 0}%
          </Text>
        </div>

        <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
          <Text
            variant="headingSm"
            fontWeight="semibold"
            color="onBgDisabled"
            className="text-gray-400 text-xs sm:text-sm"
          >
            TOTAL TEST CASES
          </Text>
          <Text
            variant="headingLg"
            fontWeight="bold"
            className="text-green-600 text-xl sm:text-2xl"
          >
            {totalTests || 0}
          </Text>
        </div>

        <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
          <Text
            variant="headingSm"
            fontWeight="semibold"
            color="onBgDisabled"
            className="text-gray-400 text-xs sm:text-sm"
          >
            PASSED TESTS
          </Text>
          <Text
            variant="headingLg"
            fontWeight="bold"
            className="text-green-600 text-xl sm:text-2xl"
          >
            {passedTests || 0}
          </Text>
        </div>

        <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center">
          <Text
            variant="headingSm"
            fontWeight="semibold"
            color="onBgDisabled"
            className="text-gray-400 text-xs sm:text-sm"
          >
            FAILED TESTS
          </Text>
          <Text
            variant="headingLg"
            fontWeight="bold"
            className="text-green-600 text-xl sm:text-2xl"
          >
            {failedTests || 0}
          </Text>
        </div>

        <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center sm:col-span-2 md:col-span-1 lg:col-span-1">
          <Text
            variant="headingSm"
            fontWeight="semibold"
            color="onBgDisabled"
            className="text-gray-400 text-xs sm:text-sm"
          >
            SKIPPED TESTS
          </Text>
          <Text
            variant="headingLg"
            fontWeight="bold"
            className="text-green-600 text-xl sm:text-2xl"
          >
            {skippedTests || 0}
          </Text>
        </div>
      </div>

      {/* Risk Severity Summary */}
      <div className="mt-6 manual-eval-input-panel p-4 sm:p-6 bg-white">
        <div className="mb-4 flex items-baseline gap-2">
          <Text variant="bodyMd" className="text-gray-900">
            Total Issues Identified:
          </Text>
          <Text variant="bodyMd" className="text-[#E11D48] font-semibold">
            {totalIssues} {totalIssues === 1 ? "Issue" : "Issues"}
          </Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-[16px] bg-[#EFF6FF] px-6 py-4 flex flex-col justify-center">
            <Text
              variant="bodySm"
              fontWeight="semibold"
              className="text-xs text-gray-500 mb-2"
            >
              LOW RISK
            </Text>
            <Text
              variant="headingLg"
              fontWeight="bold"
              className="text-[#2563EB] text-2xl"
            >
              {riskSummary.low}
            </Text>
          </div>

          <div className="rounded-[16px] bg-[#FFFBEB] px-6 py-4 flex flex-col justify-center">
            <Text
              variant="bodySm"
              fontWeight="semibold"
              className="text-xs text-gray-500 mb-2"
            >
              MEDIUM RISK
            </Text>
            <Text
              variant="headingLg"
              fontWeight="bold"
              className="text-[#92400E] text-2xl"
            >
              {riskSummary.medium}
            </Text>
          </div>

          <div className="rounded-[16px] bg-[#FEF2F2] px-6 py-4 flex flex-col justify-center">
            <Text
              variant="bodySm"
              fontWeight="semibold"
              className="text-xs text-gray-500 mb-2"
            >
              HIGH RISK
            </Text>
            <Text
              variant="headingLg"
              fontWeight="bold"
              className="text-[#E11D48] text-2xl"
            >
              {riskSummary.high}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationSummaryCard;
