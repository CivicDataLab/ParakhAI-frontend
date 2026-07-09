import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUBMIT_AUDIT_REVIEW_MUTATION } from '@/features/dashboard/api/evaluation-queries';
import { makeBulkAudit } from '@/testing/fixtures/bulk-evaluation';
import { mockToast } from '@/testing/mocks/opub-ui';
import { useAuditActions } from './use-audit-actions';

const mockRequest = vi.fn();
const mockStopProgressPolling = vi.fn();
const mockFetchAuditSummary = vi.fn();
const mockSetAudit = vi.fn();
const mockSetIsEvaluationSaved = vi.fn();

vi.mock('@/lib/graphql-client', () => ({
  useGraphQL: () => ({ request: mockRequest }),
}));

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

describe('useAuditActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAuditSummary.mockResolvedValue({ hasReport: false });
    mockSetAudit.mockImplementation((updater) => {
      if (typeof updater === 'function') {
        updater(makeBulkAudit());
      }
    });
  });

  const renderActions = (audit = makeBulkAudit()) =>
    renderHook(() =>
      useAuditActions({
        evaluationId: 'eval-1',
        orgId: 'org-1',
        audit,
        auditReport: null,
        setAudit: mockSetAudit,
        setIsEvaluationSaved: mockSetIsEvaluationSaved,
        fetchAuditSummary: mockFetchAuditSummary,
        stopProgressPolling: mockStopProgressPolling,
      })
    );

  describe('submitBulkReview', () => {
    it('does not call GraphQL when status is not PENDING_REVIEW', async () => {
      const audit = makeBulkAudit({ status: 'IN_PROGRESS' });
      const { result } = renderActions(audit);

      await act(async () => {
        await result.current.submitBulkReview('Recommendation text');
      });

      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('submits review successfully and updates audit state', async () => {
      mockRequest.mockResolvedValue({
        submitAuditReview: {
          success: true,
          audit: {
            id: 'audit-1',
            status: 'COMPLETED',
            completedAt: '2026-01-02T00:00:00Z',
          },
        },
      });

      const { result } = renderActions();

      await act(async () => {
        await result.current.submitBulkReview('Final recommendation');
      });

      expect(mockRequest).toHaveBeenCalledWith(
        SUBMIT_AUDIT_REVIEW_MUTATION,
        {
          input: {
            auditId: 'audit-1',
            recommendations: 'Final recommendation',
          },
        },
        { organization: 'org-1' }
      );
      expect(mockToast.success).toHaveBeenCalledWith('Review submitted successfully.');
      expect(mockSetIsEvaluationSaved).toHaveBeenCalledWith(true);
      expect(mockStopProgressPolling).toHaveBeenCalled();
      expect(mockFetchAuditSummary).toHaveBeenCalled();
    });

    it('sends null recommendations when recommendation is empty', async () => {
      mockRequest.mockResolvedValue({
        submitAuditReview: {
          success: true,
          audit: { id: 'audit-1', status: 'COMPLETED', completedAt: null },
        },
      });

      const { result } = renderActions();

      await act(async () => {
        await result.current.submitBulkReview('   ');
      });

      expect(mockRequest).toHaveBeenCalledWith(
        SUBMIT_AUDIT_REVIEW_MUTATION,
        {
          input: {
            auditId: 'audit-1',
            recommendations: null,
          },
        },
        { organization: 'org-1' }
      );
    });

    it('shows error toast on failure without updating audit', async () => {
      mockRequest.mockResolvedValue({
        submitAuditReview: { success: false, message: 'Server error' },
      });

      const { result } = renderActions();

      await act(async () => {
        await result.current.submitBulkReview('Recommendation');
      });

      expect(mockToast.error).toHaveBeenCalledWith('Server error');
      expect(mockSetIsEvaluationSaved).not.toHaveBeenCalled();
      expect(mockStopProgressPolling).not.toHaveBeenCalled();
    });

    it('shows error toast on request exception', async () => {
      mockRequest.mockRejectedValue(new Error('Network error'));

      const { result } = renderActions();

      await act(async () => {
        await result.current.submitBulkReview('Recommendation');
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Network error');
      });
    });
  });
});
