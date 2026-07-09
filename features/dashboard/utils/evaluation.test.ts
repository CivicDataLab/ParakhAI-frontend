import { describe, expect, it } from 'vitest';
import {
  canShowEvaluationResults,
  getModeLabel,
  isPlaygroundEvaluationMode,
  shouldStopPolling,
} from './evaluation';

describe('isPlaygroundEvaluationMode', () => {
  it('returns true for manual and playground modes', () => {
    expect(isPlaygroundEvaluationMode('manual')).toBe(true);
    expect(isPlaygroundEvaluationMode('playground')).toBe(true);
    expect(isPlaygroundEvaluationMode('PLAYGROUND')).toBe(true);
  });

  it('returns false for bulk modes', () => {
    expect(isPlaygroundEvaluationMode('bulk')).toBe(false);
    expect(isPlaygroundEvaluationMode('BULK')).toBe(false);
    expect(isPlaygroundEvaluationMode('automated')).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(isPlaygroundEvaluationMode(null)).toBe(false);
    expect(isPlaygroundEvaluationMode(undefined)).toBe(false);
  });
});

describe('canShowEvaluationResults for playground', () => {
  it('does not show results while in progress', () => {
    expect(canShowEvaluationResults({ status: 'IN_PROGRESS', completedAt: null }, true)).toBe(
      false
    );
    expect(canShowEvaluationResults({ status: 'PENDING_REVIEW', completedAt: null }, true)).toBe(
      false
    );
  });

  it('shows results when completed', () => {
    expect(canShowEvaluationResults({ status: 'COMPLETED', completedAt: '2026-01-02' }, true)).toBe(
      true
    );
    expect(
      canShowEvaluationResults({ status: 'IN_PROGRESS', completedAt: '2026-01-02' }, true)
    ).toBe(true);
  });
});

describe('shouldStopPolling for playground', () => {
  it('does not stop at PENDING_REVIEW', () => {
    expect(shouldStopPolling({ status: 'PENDING_REVIEW', completedAt: null }, true)).toBe(false);
  });

  it('stops when completed', () => {
    expect(shouldStopPolling({ status: 'COMPLETED', completedAt: '2026-01-02' }, true)).toBe(true);
  });

  it('continues while in progress', () => {
    expect(shouldStopPolling({ status: 'IN_PROGRESS', completedAt: null }, true)).toBe(false);
  });
});

describe('getModeLabel for playground', () => {
  it('returns Playground Evaluation for manual and playground modes', () => {
    expect(getModeLabel('manual')).toBe('Playground Evaluation');
    expect(getModeLabel('playground')).toBe('Playground Evaluation');
  });
});
