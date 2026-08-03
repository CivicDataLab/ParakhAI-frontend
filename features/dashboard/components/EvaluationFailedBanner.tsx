"use client";

import { formatAuditErrorDetails } from "@/features/dashboard/utils/evaluation";
import { Text } from "opub-ui";

type EvaluationFailedBannerProps = {
  errorDetails: unknown;
  errorMessage: string | null;
};

const EvaluationFailedBanner = ({
  errorDetails,
  errorMessage,
}: EvaluationFailedBannerProps) => {
  const errorText =
    formatAuditErrorDetails({ errorDetails, errorMessage }) ||
    "No additional details available.";

  return (
    <div className="mb-8 mt-6">
      <Text
        variant="bodyMd"
        fontWeight="bold"
        className="mb-3 block text-[#DC2626]"
      >
        Evaluation failed
      </Text>
      <Text variant="bodyMd" className="mb-3 block text-gray-900">
        None of the test cases returned a response from the model.
      </Text>
      <Text variant="bodyMd" className="mb-4 block text-gray-900">
        This may be caused by a temporary connectivity issue, server outage, or
        model unavailability. Please try a new evaluation after some time.
      </Text>
      <Text
        variant="bodyMd"
        fontWeight="semibold"
        className="mb-1 block text-gray-900"
      >
        Error details:
      </Text>
      <Text
        variant="bodyMd"
        className="block whitespace-pre-wrap text-gray-500"
      >
        {errorText}
      </Text>
    </div>
  );
};

export default EvaluationFailedBanner;
