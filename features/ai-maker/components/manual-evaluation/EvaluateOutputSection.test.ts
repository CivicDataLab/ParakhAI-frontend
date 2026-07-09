import { describe, expect, it, vi } from 'vitest';
import { createEvaluationIssueRow } from './EvaluateOutputSection';

describe('createEvaluationIssueRow', () => {
  it('creates an empty issue row with a generated id', () => {
    const row = createEvaluationIssueRow();

    expect(row.id).toMatch(/^issue-\d+-[a-z0-9]+$/);
    expect(row.issueType).toBe('');
    expect(row.severity).toBe('');
    expect(row.observations).toBe('');
    expect(row.idealOutput).toBe('');
  });
});
