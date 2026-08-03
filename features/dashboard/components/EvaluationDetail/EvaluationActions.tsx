"use client";

import Link from "next/link";
import { Button, Icon, Text } from "opub-ui";
import { IconDownload } from "@tabler/icons-react";

type EvaluationActionsProps = {
  showDownloadActions: boolean;
  isReportReady: boolean;
  isPlaygroundEvaluation: boolean;
  isBulkPendingReview: boolean;
  isSavingEvaluation: boolean;
  isGeneratingReport: boolean;
  isDownloading: boolean;
  onPrimaryAction: () => void;
  backLink: string;
  backLinkText: string;
};

const EvaluationActions = ({
  showDownloadActions,
  isReportReady,
  isPlaygroundEvaluation,
  isBulkPendingReview,
  isSavingEvaluation,
  isGeneratingReport,
  isDownloading,
  onPrimaryAction,
  backLink,
  backLinkText,
}: EvaluationActionsProps) => {
  const primaryLabel = isSavingEvaluation
    ? "Submitting..."
    : showDownloadActions
      ? isDownloading
        ? "Downloading..."
        : isGeneratingReport
          ? "Generating Report..."
          : isReportReady
            ? "Download Report"
            : "Generate Report"
      : "Submit";

  const isPrimaryDisabled =
    isSavingEvaluation ||
    isGeneratingReport ||
    (showDownloadActions ? isDownloading : !isBulkPendingReview);

  const showPrimaryButton = !isPlaygroundEvaluation || showDownloadActions;

  return (
    <div className="flex flex-col items-center gap-4 pt-8">
      {!showDownloadActions &&
        !isPlaygroundEvaluation &&
        isBulkPendingReview &&
        !isSavingEvaluation && (
          <Text variant="bodyMd" color="critical" className="text-center">
            Ready to submit? Submitting will finalise this evaluation. This
            action cannot be undone.
          </Text>
        )}

      {showPrimaryButton && (
        <Button
          kind="secondary"
          disabled={isPrimaryDisabled}
          icon={
            showDownloadActions && isReportReady ? (
              <Icon source={IconDownload} size={18} className="text-white" />
            ) : undefined
          }
          onClick={onPrimaryAction}
          className={
            showDownloadActions && isReportReady
              ? "bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold !font-bold text-base !text-base [&_svg]:text-white [&_svg]:fill-white [&_svg]:stroke-white [&_*]:text-white [&_*]:fill-white [&_*]:stroke-white"
              : "bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold !font-bold text-base !text-base"
          }
        >
          {primaryLabel}
        </Button>
      )}

      {isGeneratingReport && (
        <Text variant="bodySm" className="text-gray-600 text-center">
          Your report is being generated. This button will enable automatically
          when it is ready.
        </Text>
      )}

      <Link href={backLink}>
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

export default EvaluationActions;
