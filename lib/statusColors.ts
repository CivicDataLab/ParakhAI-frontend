/**
 * Shared status colors for assignment and evaluation status badges.
 * Used across auditor dashboard, assignments, evaluations, and model detail pages.
 */
export type StatusColorEntry = {
  bg: string;
  text: string;
  bgHex: string;
  textHex: string;
};

export const statusColors: Record<string, StatusColorEntry> = {
  // Assignment statuses
  PENDING: {
    bg: "bg-statusPendingBg",
    text: "text-statusPendingText",
    bgHex: "#fff9ed",
    textHex: "#ad5700",
  },
  ACCEPTED: {
    bg: "bg-statusAcceptedBg",
    text: "text-statusAcceptedText",
    bgHex: "#f2fcf5",
    textHex: "#18794e",
  },
  DECLINED: {
    bg: "bg-statusDeclinedBg",
    text: "text-statusDeclinedText",
    bgHex: "#fff8f8",
    textHex: "#cd2b31",
  },
  IN_PROGRESS: {
    bg: "bg-statusInProgressBg",
    text: "text-statusInProgressText",
    bgHex: "#f5faff",
    textHex: "#006adc",
  },
  COMPLETED: {
    bg: "bg-statusCompletedBg",
    text: "text-statusCompletedText",
    bgHex: "#fbfaff",
    textHex: "#5746af",
  },
  // Evaluation statuses
  DRAFT: {
    bg: "bg-statusDraftBg",
    text: "text-statusDraftText",
    bgHex: "#fbfcfd",
    textHex: "#11181c",
  },
  RUNNING: {
    bg: "bg-statusInProgressBg",
    text: "text-statusInProgressText",
    bgHex: "#f5faff",
    textHex: "#006adc",
  },
  FAILED: {
    bg: "bg-statusDeclinedBg",
    text: "text-statusDeclinedText",
    bgHex: "#fff8f8",
    textHex: "#cd2b31",
  },
};
