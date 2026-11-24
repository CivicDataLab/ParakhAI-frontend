'use client';

import Link from 'next/link';
import { IconArrowLeft, IconDownload, IconFileTypePdf, IconFileZip } from '@tabler/icons-react';
import { Button, Icon, Menu, Text } from 'opub-ui';

// Shared size/shape so the action buttons line up in one row.
// Tailwind preflight is off in this project, so borders need an explicit `border-solid`.
const ACTION_BUTTON =
  'min-h-[48px] px-6 py-3 rounded-[8px] !font-bold !text-base [&_svg]:shrink-0 disabled:!opacity-60 disabled:!cursor-not-allowed';
// The `!` overrides beat opub-ui's button styles. Icons need `stroke` overridden, not `color`:
// opub-ui's Icon passes `color="var(--icon-default)"` to the tabler icon, which writes it into
// the SVG's stroke attribute (grey), and CSS `stroke` beats that attribute.
// Primary: filled purple, for the main action (Download / Submit).
const PRIMARY_BUTTON =
  '!bg-primaryPurple2 hover:!bg-[#3a1a99] !border !border-solid !border-primaryPurple2 !text-white [&_*]:!text-white [&_svg]:![stroke:#ffffff]';
// Ghost (Back to List): no background or border, regular weight, light fill on hover.
// Same height and padding as ACTION_BUTTON so it lines up with the Download button.
const GHOST_BUTTON =
  'min-h-[48px] px-6 py-3 rounded-[8px] text-base font-regular bg-transparent text-primaryPurple2 hover:bg-[#F1EEFF] [&_svg]:shrink-0';

type EvaluationActionsProps = {
  showDownloadActions: boolean;
  isReportReady: boolean;
  isPlaygroundEvaluation: boolean;
  isBulkPendingReview: boolean;
  isSavingEvaluation: boolean;
  isGeneratingReport: boolean;
  isDownloading: boolean;
  isDownloadingExport: boolean;
  onPrimaryAction: () => void;
  onDownloadExport: () => void;
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
  isDownloadingExport,
  onPrimaryAction,
  onDownloadExport,
  backLink,
  backLinkText,
}: EvaluationActionsProps) => {
  // Submit button (shown before the evaluation is finalised).
  const showSubmitButton = !isPlaygroundEvaluation;
  const isSubmitDisabled = isSavingEvaluation || !isBulkPendingReview;
  const submitLabel = isSavingEvaluation ? 'Submitting...' : 'Submit';

  // Download menu: the PDF report and the evaluation data share one button. The ZIP is built
  // on the fly, so it stays available while the PDF is generating; each item is disabled
  // only while its own download is in flight.
  const isPdfBusy = isGeneratingReport || isDownloading;
  const downloadLabel = isGeneratingReport
    ? 'Generating Report...'
    : isDownloading || isDownloadingExport
      ? 'Downloading...'
      : 'Download';

  return (
    <div className="flex w-full flex-col items-center gap-3 pt-4">
      {!showDownloadActions &&
        !isPlaygroundEvaluation &&
        isBulkPendingReview &&
        !isSavingEvaluation && (
          <Text variant="bodyMd" color="critical" className="text-center">
            Ready to submit? Submitting will finalise this evaluation. This action cannot be undone.
          </Text>
        )}

      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <Link href={backLink} className={`${GHOST_BUTTON} inline-flex items-center gap-2`}>
          <IconArrowLeft size={18} stroke={2} style={{ color: 'var(--primary-purple-color2)' }} />
          {backLinkText}
        </Link>

        {showDownloadActions ? (
          <Menu
            align="end"
            side="bottom"
            sideOffset={6}
            closeOnSelect
            trigger={
              <Button
                kind="secondary"
                icon={<Icon source={IconDownload} size={18} />}
                disclosure
                className={`${ACTION_BUTTON} ${PRIMARY_BUTTON}`}
              >
                {downloadLabel}
              </Button>
            }
            items={[
              {
                content: isReportReady ? 'Report (PDF)' : 'Generate report (PDF)',
                helpText: isReportReady
                  ? 'Summary with sampled issues'
                  : 'Creates the report. Download it once it is ready.',
                icon: IconFileTypePdf,
                disabled: isPdfBusy,
                onAction: onPrimaryAction,
              },
              {
                content: 'Evaluation data (ZIP)',
                helpText: 'Every prompt and result, as JSON',
                icon: IconFileZip,
                disabled: isDownloadingExport,
                onAction: onDownloadExport,
              },
            ]}
          />
        ) : (
          showSubmitButton && (
            <Button
              kind="secondary"
              disabled={isSubmitDisabled}
              onClick={onPrimaryAction}
              className={`${ACTION_BUTTON} ${PRIMARY_BUTTON}`}
            >
              {submitLabel}
            </Button>
          )
        )}
      </div>

      {isGeneratingReport && (
        <Text variant="bodySm" className="text-gray-600 text-center">
          Your report is being generated. You can download it from the Download menu once it is
          ready.
        </Text>
      )}
    </div>
  );
};

export default EvaluationActions;
