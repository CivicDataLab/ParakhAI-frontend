/** A group of selected prompts sharing the same set of available columns —
 *  one entry per selected library (schema-level columns) in library mode, or
 *  per distinct filled-column combination of custom rows in custom mode. */
export type PromptCoverageSource = {
  fields: string[];
  count: number;
};

/** A metric can only run on prompts whose source provides all of its mandatory
 *  input columns. Library schemas only tell us a column exists, not that every
 *  row has a value in it, so this is an upper bound in library mode. */
export const countUsablePrompts = (
  sources: PromptCoverageSource[],
  mandatoryInputs: string[],
): number => {
  const required = mandatoryInputs.map((column) => column.trim().toLowerCase());
  return sources.reduce((sum, source) => {
    const fields = new Set(
      source.fields.map((field) => field.trim().toLowerCase()),
    );
    return required.every((column) => fields.has(column))
      ? sum + source.count
      : sum;
  }, 0);
};

/** Metrics with fewer usable prompts than this block the evaluation. */
export const MIN_USABLE_PROMPTS_PER_METRIC = 3;
