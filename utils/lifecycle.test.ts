import { describe, expect, it } from 'vitest';
import { isDeprecatedLifecycle } from './lifecycle';

describe('isDeprecatedLifecycle', () => {
  it('returns true for DEPRECATED', () => {
    expect(isDeprecatedLifecycle('DEPRECATED')).toBe(true);
  });

  it('returns true for typo variants', () => {
    expect(isDeprecatedLifecycle('DEPRECETED')).toBe(true);
    expect(isDeprecatedLifecycle('DEPRECIATED')).toBe(true);
  });

  it('returns false for PRODUCTION', () => {
    expect(isDeprecatedLifecycle('PRODUCTION')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isDeprecatedLifecycle(null)).toBe(false);
    expect(isDeprecatedLifecycle(undefined)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isDeprecatedLifecycle('deprecated')).toBe(true);
  });
});
