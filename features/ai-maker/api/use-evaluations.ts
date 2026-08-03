'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from '@/lib/graphql-client';
import {
  AUDIT_METRICS_QUERY,
  CREATE_BLANK_AUDIT_MUTATION,
  GET_AUDIT_QUERY,
  GET_AUDIT_SUMMARY,
  GET_EVALUATIONS,
  UPDATE_AUDIT_MUTATION,
} from './queries';

export type Evaluation = {
  id: string;
  name: string;
  status: string;
  passedTests: number | null;
  failedTests: number | null;
  totalTests: number | null;
  skippedTests: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  modelName: string | null;
  modelId: string;
  auditType: string;
  evaluationMode: string;
};

export type AuditMetrics = {
  evaluationRuns: number;
  testCasesCount: number;
  models: number;
  issuesFlagged: number;
};

export function useEvaluations(orgId: string, limit = 100, offset = 0) {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['evaluations', orgId, limit, offset],
    queryFn: async () => {
      const response = await request(
        GET_EVALUATIONS,
        { limit, offset },
        { organization: orgId }
      );
      return {
        data: (response?.audits?.data ?? []) as Evaluation[],
        total: response?.audits?.totalItemsCount ?? 0,
      };
    },
    enabled: isAuthenticated && !!orgId,
    staleTime: 60 * 1000,
  });
}

export function useEvaluation(auditId: string, orgId: string) {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['evaluation', auditId, orgId],
    queryFn: async () => {
      const response = await request(GET_AUDIT_QUERY, { auditId }, { organization: orgId });
      return response?.audit ?? null;
    },
    enabled: isAuthenticated && !!auditId && !!orgId,
    staleTime: 60 * 1000,
  });
}

export function useAuditSummary(auditId: string, orgId: string) {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['auditSummary', auditId, orgId],
    queryFn: async () => {
      const response = await request(GET_AUDIT_SUMMARY, { auditId }, { organization: orgId });
      return response?.auditSummary ?? null;
    },
    enabled: isAuthenticated && !!auditId && !!orgId,
    staleTime: 60 * 1000,
  });
}

export function useAuditMetrics(orgId: string) {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['auditMetrics', orgId],
    queryFn: async () => {
      const response = await request(AUDIT_METRICS_QUERY, {}, { organization: orgId });
      return (response?.auditMetrics ?? null) as AuditMetrics | null;
    },
    enabled: isAuthenticated && !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateEvaluation(orgId: string) {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, any>) =>
      request(CREATE_BLANK_AUDIT_MUTATION, { input }, { organization: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations', orgId] });
    },
  });
}

export function useUpdateEvaluation(orgId: string) {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, any>) =>
      request(UPDATE_AUDIT_MUTATION, { input }, { organization: orgId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluations', orgId] });
      if (variables?.input?.id) {
        queryClient.invalidateQueries({ queryKey: ['evaluation', variables.input.id, orgId] });
      }
    },
  });
}
