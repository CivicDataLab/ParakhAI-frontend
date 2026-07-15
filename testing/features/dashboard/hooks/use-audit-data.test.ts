import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GET_AUDIT_QUERY,
  GET_AUDIT_RESULTS_QUERY,
  GET_AUDIT_SUMMARY,
} from '@/features/dashboard/api/evaluation-queries';
import { useAuditData } from '@/features/dashboard/components/EvaluationDetail/hooks/use-audit-data';
import { makePlaygroundAudit } from '@/testing/fixtures/playground-evaluation';

const mockRequest = vi.fn();

vi.mock('@/lib/graphql-client', () => ({
  useGraphQL: () => ({
    request: mockRequest,
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe('useAuditData playground behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch results while playground audit is in progress', async () => {
    mockRequest.mockImplementation((query: string) => {
      if (query === GET_AUDIT_QUERY) {
        return Promise.resolve({
          audit: makePlaygroundAudit({ status: 'IN_PROGRESS', evaluationMode: 'PLAYGROUND' }),
        });
      }
      return Promise.resolve({});
    });

    const { result } = renderHook(() => useAuditData('eval-1', 'org-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.audit?.evaluationMode).toBe('PLAYGROUND');
    expect(result.current.auditResults).toBeNull();
    expect(mockRequest).toHaveBeenCalledWith(
      GET_AUDIT_QUERY,
      { auditId: 'eval-1' },
      { organization: 'org-1' }
    );
    expect(mockRequest).not.toHaveBeenCalledWith(
      GET_AUDIT_RESULTS_QUERY,
      expect.anything(),
      expect.anything()
    );
    expect(mockRequest).not.toHaveBeenCalledWith(
      GET_AUDIT_SUMMARY,
      expect.anything(),
      expect.anything()
    );
  });

  it('fetches summary and results when playground audit is completed', async () => {
    mockRequest.mockImplementation((query: string) => {
      if (query === GET_AUDIT_QUERY) {
        return Promise.resolve({
          audit: makePlaygroundAudit({
            status: 'COMPLETED',
            completedAt: '2026-01-02T00:00:00Z',
            evaluationMode: 'manual',
          }),
        });
      }
      if (query === GET_AUDIT_SUMMARY) {
        return Promise.resolve({
          auditSummaries: [
            {
              hasReport: false,
              riskDistribution: null,
              metricSummary: null,
              recommendations: null,
              auditReport: null,
            },
          ],
        });
      }
      if (query === GET_AUDIT_RESULTS_QUERY) {
        return Promise.resolve({ auditResults: [] });
      }
      return Promise.resolve({});
    });

    const { result } = renderHook(() => useAuditData('eval-1', 'org-1'));

    await waitFor(() => {
      expect(result.current.auditResults).toEqual([]);
    });

    expect(mockRequest).toHaveBeenCalledWith(
      GET_AUDIT_SUMMARY,
      { audit_id: 'eval-1' },
      { organization: 'org-1' }
    );
    expect(mockRequest).toHaveBeenCalledWith(
      GET_AUDIT_RESULTS_QUERY,
      { auditId: 'eval-1', metric: null },
      { organization: 'org-1' }
    );
  });
});
