"use client";

import { formatStatusLabel } from "@/utils";
import {
  getEvaluationModeColor,
  getEvaluationStatusColor,
} from "@/utils/status-colors";
import { getModeLabel } from "@/features/dashboard/utils/evaluation";
import type { Audit } from "@/features/dashboard/types/audit";
import Link from "next/link";
import { Button, Tag, Text, TextField, toast } from "opub-ui";

type EvaluationHeaderProps = {
  audit: Audit;
  editableName: string;
  onNameChange: (value: string) => void;
  onNameBlur: () => void;
  backLink: string;
  backLinkText: string;
};

const EvaluationHeader = ({
  audit,
  editableName,
  onNameChange,
  onNameBlur,
  backLink,
  backLinkText,
}: EvaluationHeaderProps) => {
  const statusColors = getEvaluationStatusColor(audit.status);
  const evaluationMode = getEvaluationModeColor(audit.evaluationMode);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 mt-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 text-left">
          <Text
            variant="bodyMd"
            className="text-gray-500 whitespace-nowrap mr-2"
          >
            Evaluation Name :{" "}
          </Text>
          <div
            className="audit-name-input-wrapper max-w-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onNameBlur();
              }
            }}
          >
            <TextField
              id="evaluationName"
              name="evaluationName"
              label="Evaluation Name"
              labelHidden
              value={editableName}
              onBlur={onNameBlur}
              onChange={onNameChange}
            />
          </div>
        </div>

        <span className="self-start sm:self-auto">
          <Tag
            variation="filled"
            fillColor={statusColors.fillColor}
            textColor={statusColors.textColor}
          >
            {formatStatusLabel(audit.status)}
          </Tag>
        </span>

        <span className="self-start sm:self-auto">
          <Tag
            variation="filled"
            fillColor={evaluationMode.fillColor}
            textColor={evaluationMode.textColor}
          >
            {getModeLabel(audit.evaluationMode)}
          </Tag>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={backLink}
          className="w-full sm:w-auto"
          onClick={() => toast.dismiss()}
        >
          <Button
            kind="secondary"
            className="px-8 py-3 rounded-[8px] font-bold text-base w-full sm:w-auto"
          >
            {backLinkText}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default EvaluationHeader;
