/**
 * Shared lifecycle-stage helpers for AI model versions.
 * Used across model detail and evaluation flows.
 */

const DEPRECATED_LIFECYCLE_STAGES = new Set(['DEPRECATED', 'DEPRECETED', 'DEPRECIATED']);

export function isDeprecatedLifecycle(lifecycleStage?: string | null): boolean {
  const normalizedStage = (lifecycleStage || '').toUpperCase();
  return DEPRECATED_LIFECYCLE_STAGES.has(normalizedStage);
}
