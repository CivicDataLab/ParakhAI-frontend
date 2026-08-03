import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GENERATE_AUDIT_REPORT_QUERY,
  SUBMIT_AUDIT_REVIEW_MUTATION,
  UPDATE_AUDIT_MUTATION,
} from '@/features/dashboard/api/evaluation-queries';
import { useAuditActions } from '@/features/dashboard/components/EvaluationDetail/hooks/use-audit-actions';
import { apiFetch } from '@/lib/rest-client';
import { makeBulkAudit } from '@/testing/fixtures/bulk-evaluation';
import { mockToast } from '@/testing/mocks/opub-ui';

const mockRequest = vi.fn();
const mockApiFetch = vi.mocked(apiFetch);
const mockStopProgressPolling = vi.fn();
const mockFetchAuditSummary = vi.fn();
const mockSetAudit = vi.fn();
const mockSetIsEvaluationSaved = vi.fn();

const EVALUATION_NAME_TOAST_ID = 'evaluation-detail-name-save';

vi.mock('@/lib/graphql-client', () => ({
  useGraphQL: () => ({ request: mockRequest }),
}));

// rest-client imports next-auth/react, which throws Invalid URL when NEXTAUTH_URL is unset (e.g. CI/act)
vi.mock('@/lib/rest-client', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('opub-ui', async () => {
  const { getOpubUiMockModule } = await import('@/testing/mocks/opub-ui');
  return getOpubUiMockModule();
});

describe('useAuditActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL = 'https://api.example.com';
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

  describe('saveEvaluationName', () => {
    it('shows error toast when name is empty', async () => {
      const { result } = renderActions();

      await act(async () => {
        await result.current.saveEvaluationName('   ');
      });

      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith('Evaluation name is required.', {
        id: EVALUATION_NAME_TOAST_ID,
      });
    });

    it('does not call GraphQL when name is unchanged', async () => {
      const audit = makeBulkAudit({ name: 'Bulk Evaluation 1' });
      const { result } = renderActions(audit);

      await act(async () => {
        await result.current.saveEvaluationName('Bulk Evaluation 1');
      });

      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockToast.error).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it('updates audit and shows success toast on save', async () => {
      mockRequest.mockResolvedValue({
        updateAudit: {
          success: true,
          audit: { id: 'audit-1', name: 'Renamed Evaluation' },
        },
      });

      const { result } = renderActions();

      await act(async () => {
        await result.current.saveEvaluationName('  Renamed Evaluation  ');
      });

      expect(mockRequest).toHaveBeenCalledWith(
        UPDATE_AUDIT_MUTATION,
        { input: { auditId: 'audit-1', name: 'Renamed Evaluation' } },
        { organization: 'org-1' }
      );
      expect(mockSetAudit).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Evaluation name saved successfully.', {
        id: EVALUATION_NAME_TOAST_ID,
      });
    });

    it('shows error toast when server returns success:false', async () => {
      mockRequest.mockResolvedValue({
        updateAudit: { success: false, message: 'Name already taken' },
      });

      const { result } = renderActions();

      await act(async () => {
        await result.current.saveEvaluationName('Duplicate Name');
      });

      expect(mockToast.error).toHaveBeenCalledWith('Name already taken', {
        id: EVALUATION_NAME_TOAST_ID,
      });
      expect(mockSetAudit).not.toHaveBeenCalled();
    });

    it('shows default error message when server returns success:false without message', async () => {
      mockRequest.mockResolvedValue({
        updateAudit: { success: false },
      });

      const { result } = renderActions();

      await act(async () => {
        await result.current.saveEvaluationName('New Name');
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        'Failed to save evaluation name on the server.',
        { id: EVALUATION_NAME_TOAST_ID }
      );
    });

    it('shows error toast on request exception', async () => {
      mockRequest.mockRejectedValue(new Error('GraphQL error'));

      const { result } = renderActions();

      await act(async () => {
        await result.current.saveEvaluationName('New Name');
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('GraphQL error', {
          id: EVALUATION_NAME_TOAST_ID,
        });
      });
    });

    it('shows generic error toast on non-Error rejection', async () => {
      mockRequest.mockRejectedValue('unexpected failure');

      const { result } = renderActions();

      await act(async () => {
        await result.current.saveEvaluationName('New Name');
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Failed to save evaluation name. Please try again.',
          { id: EVALUATION_NAME_TOAST_ID }
        );
      });
    });
  });

  describe('generateReport', () => {
    it('generates report successfully and refreshes audit summary', async () => {
      mockRequest.mockResolvedValue({
        generateAuditReport: { success: true },
      });

      const { result } = renderActions();

      await act(async () => {
        await result.current.generateReport();
      });

      expect(mockRequest).toHaveBeenCalledWith(
        GENERATE_AUDIT_REPORT_QUERY,
        { auditId: 'eval-1' },
        { organization: 'org-1' }
      );
      expect(mockToast.success).toHaveBeenCalledWith('Report generated successfully!');
      expect(mockFetchAuditSummary).toHaveBeenCalled();
    });

    it('shows error toast when server returns success:false', async () => {
      mockRequest.mockResolvedValue({
        generateAuditReport: { success: false, message: 'Report unavailable' },
      });

      const { result } = renderActions();

      await act(async () => {
        await result.current.generateReport();
      });

      expect(mockToast.error).toHaveBeenCalledWith('Failed to generate report.');
      expect(mockFetchAuditSummary).not.toHaveBeenCalled();
    });

    it('shows error toast on request exception', async () => {
      mockRequest.mockRejectedValue(new Error('Network error'));

      const { result } = renderActions();

      await act(async () => {
        await result.current.generateReport();
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to generate report.');
      });
    });
  });

  describe('downloadReport', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('downloads report by creating and clicking an anchor', async () => {
      // Avoid jsdom "navigation to another Document" when the anchor is clicked
      const mockClick = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        target: '',
        rel: '',
        click: mockClick,
      } as unknown as HTMLAnchorElement;

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
        if (tagName === 'a') return mockAnchor;
        return originalCreateElement(tagName, options);
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://cdn.example.com/report.pdf', name: 'audit_report.pdf' }),
      } as Response);

      const { result } = renderActions();

      await act(async () => {
        await result.current.downloadReport();
      });

      expect(mockApiFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/audits/eval-1/report/download/',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            organization: 'org-1',
          },
        }
      );
      expect(mockAnchor.href).toBe('https://cdn.example.com/report.pdf');
      expect(mockAnchor.download).toBe('audit_report.pdf');
      expect(mockClick).toHaveBeenCalled();
    });

    it('alerts when response is not ok', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      // Production code console.error's the mock failure; silence expected noise
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Report not found' }),
      } as Response);

      const { result } = renderActions();

      await act(async () => {
        await result.current.downloadReport();
      });

      expect(alertSpy).toHaveBeenCalledWith('Report not found');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('alerts with generic message on download failure', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mocked rejection only — apiFetch is stubbed; no real network call
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderActions();

      await act(async () => {
        await result.current.downloadReport();
      });

      expect(alertSpy).toHaveBeenCalledWith('Network error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
