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
    <div className="flex flex-row items-center justify-between gap-4 mb-8 mt-10 flex-wrap">
      <div className="flex flex-row items-center gap-3 flex-wrap">
        <div className="flex flex-row items-center gap-1">
          <Text variant="bodyMd" className="text-gray-500 whitespace-nowrap mr-2">
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

        <Tag
          variation="filled"
          fillColor={statusColors.fillColor}
          textColor={statusColors.textColor}
        >
          {formatStatusLabel(audit.status)}
        </Tag>

        <Tag
          variation="filled"
          fillColor={evaluationMode.fillColor}
          textColor={evaluationMode.textColor}
        >
          {getModeLabel(audit.evaluationMode)}
        </Tag>
      </div>

      <Link href={backLink} onClick={() => toast.dismiss()}>
        <Button
          kind="secondary"
          className="px-8 py-3 rounded-[8px] font-bold text-base"
        >
          {backLinkText}
        </Button>
      </Link>
    </div>
  );
};

export default EvaluationHeader;
