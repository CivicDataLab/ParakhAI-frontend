import { describe, expect, it } from 'vitest';
import {
  cn,
  formatAssignmentStatusLabel,
  formatDate,
  formatGraphQLError,
  formatStatusLabel,
  isPendingAssignmentStatus,
  stripMarkdown,
  toTitleCase,
} from './index';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('handles tailwind conflicts by taking the last value', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

describe('toTitleCase', () => {
  it('converts string to title case', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
  });

  it('returns empty string for empty input', () => {
    expect(toTitleCase('')).toBe('');
  });
});

describe('formatStatusLabel', () => {
  it('returns QUEUED for PENDING status', () => {
    expect(formatStatusLabel('PENDING')).toBe('QUEUED');
  });

  it('replaces underscores with spaces', () => {
    expect(formatStatusLabel('IN_PROGRESS')).toBe('IN PROGRESS');
  });

  it('returns Unknown for null/undefined', () => {
    expect(formatStatusLabel(null)).toBe('Unknown');
    expect(formatStatusLabel(undefined)).toBe('Unknown');
  });

  it('lowercases when option is set', () => {
    expect(formatStatusLabel('COMPLETED', { lowercase: true })).toBe('completed');
  });
});

describe('formatAssignmentStatusLabel', () => {
  it('returns PENDING for QUEUED status', () => {
    expect(formatAssignmentStatusLabel('QUEUED')).toBe('PENDING');
  });

  it('keeps ACCEPTED as is', () => {
    expect(formatAssignmentStatusLabel('ACCEPTED')).toBe('ACCEPTED');
  });
});

describe('isPendingAssignmentStatus', () => {
  it('returns true for PENDING', () => {
    expect(isPendingAssignmentStatus('PENDING')).toBe(true);
  });

  it('returns true for QUEUED', () => {
    expect(isPendingAssignmentStatus('QUEUED')).toBe(true);
  });

  it('returns false for ACCEPTED', () => {
    expect(isPendingAssignmentStatus('ACCEPTED')).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats a date string correctly', () => {
    const result = formatDate('2024-01-15');
    expect(result).toContain('2024');
    expect(result).toContain('January');
  });
});

describe('stripMarkdown', () => {
  it('removes markdown headers', () => {
    expect(stripMarkdown('# Hello World')).toBe('Hello World');
  });

  it('removes bold markers', () => {
    expect(stripMarkdown('**bold text**')).toBe('bold text');
  });

  it('removes links', () => {
    expect(stripMarkdown('[click here](https://example.com)')).toBe('click here');
  });

  it('returns empty string for empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });
});

describe('formatGraphQLError', () => {
  it('extracts message from Error object', () => {
    const result = formatGraphQLError(new Error('Something failed'));
    expect(result).toBe('Something failed');
  });

  it('returns fallback for unknown errors', () => {
    const result = formatGraphQLError(null);
    expect(result).toBe('Something went wrong');
  });

  it('truncates very long messages', () => {
    const longMessage = 'A'.repeat(200);
    const result = formatGraphQLError(longMessage);
    expect(result.length).toBeLessThanOrEqual(180);
    expect(result.endsWith('...')).toBe(true);
  });
});
