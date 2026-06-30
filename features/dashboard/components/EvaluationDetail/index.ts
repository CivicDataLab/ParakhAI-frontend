export { default } from "./EvaluationDetail";
// Re-export shared helpers so existing imports from this barrel still work
export { formatModuleName, getSeverityTagColors } from "@/features/dashboard/utils/evaluation";
export type { Audit, TestCase } from "@/features/dashboard/types/audit";
