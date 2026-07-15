import { describe, expect, it } from 'vitest';
import {
  getEvaluationModeColor,
  getEvaluationStatusColor,
  statusColors,
} from '@/utils/status-colors';

describe('statusColors', () => {
  it('contains all expected status keys', () => {
    const expectedKeys = [
      'QUEUED',
      'PENDING',
      'ACCEPTED',
      'DECLINED',
      'IN_PROGRESS',
      'COMPLETED',
      'DRAFT',
      'RUNNING',
      'FAILED',
    ];

    for (const key of expectedKeys) {
      expect(statusColors[key]).toBeDefined();
      expect(statusColors[key]).toMatchObject({
        bg: expect.any(String),
        text: expect.any(String),
        bgHex: expect.any(String),
        textHex: expect.any(String),
      });
    }
  });
});

describe('getEvaluationStatusColor', () => {
  it('returns COMPLETED colors', () => {
    expect(getEvaluationStatusColor('COMPLETED')).toEqual({
      fillColor: '#E2F5C4',
      textColor: '#166534',
    });
  });

  it('returns PENDING_REVIEW colors', () => {
    expect(getEvaluationStatusColor('PENDING_REVIEW')).toEqual({
      fillColor: '#FEF3C7',
      textColor: '#92400E',
    });
  });

  it('returns IN_PROGRESS colors', () => {
    expect(getEvaluationStatusColor('IN_PROGRESS')).toEqual({
      fillColor: '#FEF3C7',
      textColor: '#92400E',
    });
  });

  it('returns QUEUED colors', () => {
    expect(getEvaluationStatusColor('QUEUED')).toEqual({
      fillColor: '#E0E7FF',
      textColor: '#3730A3',
    });
  });

  it('returns PENDING colors', () => {
    expect(getEvaluationStatusColor('PENDING')).toEqual({
      fillColor: '#E0E7FF',
      textColor: '#3730A3',
    });
  });

  it('returns DRAFT colors', () => {
    expect(getEvaluationStatusColor('DRAFT')).toEqual({
      fillColor: '#FEF9C3',
      textColor: '#854D0E',
    });
  });

  it('returns FAILED colors', () => {
    expect(getEvaluationStatusColor('FAILED')).toEqual({
      fillColor: '#FEE2E2',
      textColor: '#DC2626',
    });
  });

  it('returns ERROR colors', () => {
    expect(getEvaluationStatusColor('ERROR')).toEqual({
      fillColor: '#FEE2E2',
      textColor: '#DC2626',
    });
  });

  it('returns CANCELLED colors', () => {
    expect(getEvaluationStatusColor('CANCELLED')).toEqual({
      fillColor: '#F3F4F6',
      textColor: '#6B7280',
    });
  });

  it('returns default colors for unknown status', () => {
    expect(getEvaluationStatusColor('UNKNOWN')).toEqual({
      fillColor: '#F3F4F6',
      textColor: '#374151',
    });
  });

  it('returns default colors for null status', () => {
    expect(getEvaluationStatusColor(null)).toEqual({
      fillColor: '#F3F4F6',
      textColor: '#374151',
    });
  });

  it('returns default colors for undefined status', () => {
    expect(getEvaluationStatusColor(undefined)).toEqual({
      fillColor: '#F3F4F6',
      textColor: '#374151',
    });
  });

  it('handles lowercase status via toUpperCase', () => {
    expect(getEvaluationStatusColor('completed')).toEqual({
      fillColor: '#E2F5C4',
      textColor: '#166534',
    });
    expect(getEvaluationStatusColor('pending_review')).toEqual({
      fillColor: '#FEF3C7',
      textColor: '#92400E',
    });
  });
});

describe('getEvaluationModeColor', () => {
  it('returns evaluation mode colors regardless of mode', () => {
    const expected = {
      fillColor: '#d6d7d8',
      textColor: '#374151',
    };

    expect(getEvaluationModeColor()).toEqual(expected);
    expect(getEvaluationModeColor('manual')).toEqual(expected);
    expect(getEvaluationModeColor('bulk')).toEqual(expected);
    expect(getEvaluationModeColor(null)).toEqual(expected);
  });
});
