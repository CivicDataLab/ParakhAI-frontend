import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET_AUDIT_QUERY } from '@/features/dashboard/api/evaluation-queries';
import { makePlaygroundAudit } from '@/testing/fixtures/playground-evaluation';
import { useAuditPolling } from './use-audit-polling';

const mockRequest = vi.fn();
const mockSetAudit = vi.fn();
const mockSetEvaluationProgress = vi.fn();
const mockFetchAuditSummary = vi.fn();
const mockFetchAuditResults = vi.fn();

vi.mock('@/lib/graphql-client', () => ({
  useGraphQL: () => ({ request: mockRequest }),
}));

describe('useAuditPolling playground behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFetchAuditSummary.mockResolvedValue({ hasReport: false });
    mockFetchAuditResults.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderPolling = (audit = makePlaygroundAudit({ status: 'IN_PROGRESS' })) =>
    renderHook(
      ({ currentAudit }) =>
        useAuditPolling({
          evaluationId: 'eval-1',
          orgId: 'org-1',
          audit: currentAudit,
          isAuthenticated: true,
          isSessionLoading: false,
          setAudit: mockSetAudit,
          setEvaluationProgress: mockSetEvaluationProgress,
          fetchAuditSummary: mockFetchAuditSummary,
          fetchAuditResults: mockFetchAuditResults,
        }),
      { initialProps: { currentAudit: audit } }
    );

  it('continues polling while playground audit is IN_PROGRESS', async () => {
    mockRequest.mockResolvedValue({
      audit: makePlaygroundAudit({
        status: 'IN_PROGRESS',
        evaluationMode: 'PLAYGROUND',
        progressPercentage: 40,
      }),
    });

    renderPolling();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockFetchAuditResults).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('stops polling and fetches results when playground audit completes', async () => {
    mockRequest.mockResolvedValue({
      audit: makePlaygroundAudit({
        status: 'COMPLETED',
        completedAt: '2026-01-02T00:00:00Z',
        evaluationMode: 'manual',
      }),
    });

    renderPolling();

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockRequest).toHaveBeenCalledWith(
      GET_AUDIT_QUERY,
      { auditId: 'eval-1' },
      { organization: 'org-1' }
    );
    expect(mockFetchAuditSummary).toHaveBeenCalled();
    expect(mockFetchAuditResults).toHaveBeenCalled();

    mockRequest.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('does not stop polling at PENDING_REVIEW for playground audits', async () => {
    mockRequest.mockResolvedValue({
      audit: makePlaygroundAudit({
        status: 'PENDING_REVIEW',
        evaluationMode: 'PLAYGROUND',
      }),
    });

    renderPolling();

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockFetchAuditResults).not.toHaveBeenCalled();

    mockRequest.mockClear();
    mockRequest.mockResolvedValue({
      audit: makePlaygroundAudit({
        status: 'PENDING_REVIEW',
        evaluationMode: 'PLAYGROUND',
      }),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
