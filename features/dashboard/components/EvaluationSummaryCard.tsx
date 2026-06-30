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

      {/* Stat cards — flex row so they always stay on one line */}
      <div className="flex flex-row gap-4 sm:gap-6 md:gap-8">
        <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center flex-1">
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
            className="text-xl sm:text-2xl"
          >
            {passRate || 0}%
          </Text>
        </div>

        <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center flex-1">
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
            className="text-xl sm:text-2xl"
          >
            {totalTests || 0}
          </Text>
        </div>

        <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center flex-1">
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
            className="text-xl sm:text-2xl"
          >
            {passedTests || 0}
          </Text>
        </div>

        <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center flex-1">
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
            className="text-xl sm:text-2xl"
          >
            {failedTests || 0}
          </Text>
        </div>

        <div className="result-summary-evaluation-section flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 justify-center flex-1">
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
            className="text-xl sm:text-2xl"
          >
            {skippedTests || 0}
          </Text>
        </div>
      </div>

      {/* Risk Severity Summary — flex row so they always stay on one line */}
      <div className="mt-6 manual-eval-input-panel p-4 sm:p-6 bg-white">
        <div className="mb-4 flex items-baseline gap-2">
          <Text variant="bodyMd" className="text-gray-900">
            Total Issues Identified:
          </Text>
          <span style={{ color: "#E11D48", fontWeight: 600 }}>
            {totalIssues} {totalIssues === 1 ? "Issue" : "Issues"}
          </span>
        </div>

        <div className="flex flex-row gap-4">
          <div
            className="flex flex-col justify-center flex-1 px-6 py-4"
            style={{ backgroundColor: "#EFF6FF", borderRadius: 16 }}
          >
            <Text variant="bodySm" fontWeight="semibold" className="text-xs text-gray-500 mb-2">
              LOW RISK
            </Text>
            <p style={{ color: "#2563EB", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
              {riskSummary.low}
            </p>
          </div>

          <div
            className="flex flex-col justify-center flex-1 px-6 py-4"
            style={{ backgroundColor: "#FFFBEB", borderRadius: 16 }}
          >
            <Text variant="bodySm" fontWeight="semibold" className="text-xs text-gray-500 mb-2">
              MEDIUM RISK
            </Text>
            <p style={{ color: "#92400E", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
              {riskSummary.medium}
            </p>
          </div>

          <div
            className="flex flex-col justify-center flex-1 px-6 py-4"
            style={{ backgroundColor: "#FEF2F2", borderRadius: 16 }}
          >
            <Text variant="bodySm" fontWeight="semibold" className="text-xs text-gray-500 mb-2">
              HIGH RISK
            </Text>
            <p style={{ color: "#E11D48", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
              {riskSummary.high}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationSummaryCard;
