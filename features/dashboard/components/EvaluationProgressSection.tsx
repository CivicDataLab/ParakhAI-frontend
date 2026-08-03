"use client";

import ProgressBar from "@/components/common/ProgressBar";
import { Text } from "opub-ui";

type EvaluationProgressSectionProps = {
  progressPercent: number;
};

const EvaluationProgressSection = ({
  progressPercent,
}: EvaluationProgressSectionProps) => {
  return (
    <div className="mb-8 flex flex-col gap-2">
      <Text variant="bodySm" className="block text-gray-600">
        Evaluation results will load once the evaluation is completed.
      </Text>
      <Text variant="bodySm" className="block text-gray-600">
        Evaluation Progress : {progressPercent}%
      </Text>
      <ProgressBar value={progressPercent} max={100} color="highlight" size="small" />
    </div>
  );
};

export default EvaluationProgressSection;
