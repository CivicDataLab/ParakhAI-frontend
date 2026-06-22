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
  QUEUED: {
    bg: "bg-statusPendingBg",
    text: "text-statusPendingText",
    bgHex: "#fff9ed",
    textHex: "#ad5700",
  },
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

export type TagColors = {
  fillColor: string;
  textColor: string;
};

const DEFAULT_EVALUATION_STATUS_COLORS: TagColors = {
  fillColor: "#F3F4F6",
  textColor: "#374151",
};

const EVALUATION_MODE_COLORS: TagColors = {
  fillColor: "#d6d7d8",
  textColor: "#374151",
};

/** Tag fill/text colors for evaluation (audit) status badges in tables and detail views. */
export function getEvaluationStatusColor(
  status?: string | null,
): TagColors {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
      return { fillColor: "#E2F5C4", textColor: "#166534" };
    case "PENDING_REVIEW":
      return { fillColor: "#FEF3C7", textColor: "#92400E" };
    case "IN_PROGRESS":
      return { fillColor: "#FEF3C7", textColor: "#92400E" };
    case "QUEUED":
    case "PENDING":
      return { fillColor: "#E0E7FF", textColor: "#3730A3" };
    case "DRAFT":
      return { fillColor: "#FEF9C3", textColor: "#854D0E" };
    case "FAILED":
    case "ERROR":
      return { fillColor: "#FEE2E2", textColor: "#DC2626" };
    case "CANCELLED":
      return { fillColor: "#F3F4F6", textColor: "#6B7280" };
    default:
      return DEFAULT_EVALUATION_STATUS_COLORS;
  }
}

/** Tag fill/text colors for evaluation mode badges (e.g. manual vs bulk). */
export function getEvaluationModeColor(_mode?: string | null): TagColors {
  return EVALUATION_MODE_COLORS;
}

export { formatStatusLabel } from "./utils";
