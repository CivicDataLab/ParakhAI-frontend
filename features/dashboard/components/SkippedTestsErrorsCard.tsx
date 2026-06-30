"use client";

import { IconMinus, IconPlus } from "@tabler/icons-react";
import { Text } from "opub-ui";
import { useState } from "react";

type SkippedTestsErrorsCardProps = {
  errorMessage: string;
};

const SkippedTestsErrorsCard = ({ errorMessage }: SkippedTestsErrorsCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="skipped-tests-errors-card test-case-card-border mt-6 w-full bg-white p-6">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between border-none bg-transparent p-0 text-left"
        aria-expanded={isExpanded}
      >
        <Text variant="bodyMd" fontWeight="medium" color="critical">
          Error leading to skipped test
        </Text>
        {isExpanded ? (
          <IconMinus className="shrink-0 text-gray-600" size={20} aria-hidden />
        ) : (
          <IconPlus className="shrink-0 text-gray-600" size={20} aria-hidden />
        )}
      </button>

      {isExpanded && (
        <Text variant="bodySm" className="mt-4 block whitespace-pre-wrap text-gray-600">
          {errorMessage}
        </Text>
      )}
    </div>
  );
};

export default SkippedTestsErrorsCard;
