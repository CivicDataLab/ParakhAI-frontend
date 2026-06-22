"use client";

import Image from "next/image";
import { Text, Tooltip } from "opub-ui";

type EvaluationFormOverviewProps = {
  modelName: string;
  modelVersion: string;
  organizationName?: string;
  evalId: string;
  createdAt: string;
  completedAt: string;
  duration: string;
  scope: string;
  mode: string;
  evaluator: string;
  modules: string;
  objective: string;
};

const OverviewField = ({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) => (
  <div className="leading-relaxed">
    <Text variant="bodySm" as="span" className="text-gray-500">
      {label} :
    </Text>{" "}
    <Text
      variant={large ? "headingMd" : "bodyMd"}
      as="span"
      className={`text-gray-900 ${large ? "font-bold" : "font-medium"}`}
    >
      {value || "--"}
    </Text>
  </div>
);

const EvaluationFormOverview = ({
  modelName,
  modelVersion,
  organizationName,
  evalId,
  createdAt,
  completedAt,
  duration,
  scope,
  mode,
  evaluator,
  modules,
  objective,
}: EvaluationFormOverviewProps) => {
  return (
    <div className="mb-8 bg-white overview-evaluation-section">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Text variant="bodySm" className="text-gray-500">
              Model Name
            </Text>
            <div className="flex items-baseline gap-2 min-w-0 flex-nowrap">
              <Text
                as="h2"
                variant="headingXl"
                className="font-bold text-gray-900"
              >
                {modelName || "--"}
              </Text>
              <Text
                variant="bodyMd"
                className="text-gray-700 font-medium whitespace-nowrap"
              >
                Ver. {modelVersion || "--"}
              </Text>
            </div>
          </div>
          <Tooltip content={organizationName || "CivicDataLab"}>
            <span className="inline-flex cursor-default flex-shrink-0">
              <Image
                src="/images/logos/CDL Logo.png"
                alt="Organization logo"
                width={50}
                height={50}
                className="object-contain rounded-full cdl-round-logo"
              />
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-5">
          <Text variant="headingMd" fontWeight="bold">
            Evaluation Overview
          </Text>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-4">
            <OverviewField label="Eval ID" value={evalId} large />
            <OverviewField label="Created on" value={createdAt} />
            <OverviewField label="Completed on" value={completedAt} />
            <OverviewField label="Duration" value={duration} />
          </div>

          <div className="space-y-4">
            <OverviewField label="Scope" value={scope} />
            <OverviewField label="Mode" value={mode} />
            <OverviewField label="Evaluator" value={evaluator} />
            <OverviewField label="Modules" value={modules} />
          </div>

          <div className="lg:col-span-2 leading-relaxed">
            <Text variant="bodySm" as="span" className="text-gray-500">
              Objective :
            </Text>{" "}
            <Text variant="bodyMd" as="span" className="text-gray-900">
              {objective || "--"}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationFormOverview;
