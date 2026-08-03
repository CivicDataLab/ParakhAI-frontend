'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from '@/lib/graphql-client';
import {
  GET_AUDITOR_METRICS,
  GET_MY_ASSIGNMENTS,
  GET_MY_ASSIGNMENTS_FOR_MODEL,
  UPDATE_ASSIGNMENT_STATUS,
} from './queries';

export type AuditorAssignment = {
  id: string;
  organizationId: string;
  organizationName?: string;
  modelId: string;
  modelName?: string;
  modelVersionId: number;
  auditorId: string;
  auditorEmail: string;
  auditorUsername: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditorMetrics = {
  assignmentsCount: number;
  assignmentsAccepted: number;
  assignmentsDeclined: number;
  assignmentsPending: number;
  assignmentsCompleted: number;
  auditsDone: number;
  testCasesCount: number;
  failedTestCasesCount: number;
};

export function useAuditorMetrics() {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['auditorMetrics'],
    queryFn: async () => {
      const response = await request(GET_AUDITOR_METRICS);
      return (response?.auditorMetrics ?? null) as AuditorMetrics | null;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyAssignments(filters?: { modelId?: string; status?: string }) {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['myAssignments', filters],
    queryFn: async () => {
      const response = await request(GET_MY_ASSIGNMENTS, {
        modelId: filters?.modelId ?? null,
        status: filters?.status ?? null,
      });
      return (response?.myAssignments ?? []) as AuditorAssignment[];
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useMyAssignmentsForModel(modelId: string) {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['myAssignments', modelId],
    queryFn: async () => {
      const response = await request(GET_MY_ASSIGNMENTS_FOR_MODEL, { modelId });
      return (response?.myAssignments ?? []) as AuditorAssignment[];
    },
    enabled: isAuthenticated && !!modelId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateAssignmentStatus() {
  const { request } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, status }: { assignmentId: string; status: string }) =>
      request(UPDATE_ASSIGNMENT_STATUS, { assignmentId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['auditorMetrics'] });
    },
  });
}
