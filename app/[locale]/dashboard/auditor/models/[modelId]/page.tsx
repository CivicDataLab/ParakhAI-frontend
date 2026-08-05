'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { IconArrowLeft, IconCheck, IconPlayerPlay, IconX } from '@tabler/icons-react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataTable, Divider, Spinner, Tag, Text, toast, Tooltip } from 'opub-ui';
import RichTextRenderer from '@/components/common/RichTextRenderer';
import { useAppSession } from '@/hooks/use-app-session';
import { useGraphQL } from '@/lib/graphql-client';
import { isDeprecatedLifecycle } from '@/utils/lifecycle';
import { statusColors } from '@/utils/status-colors';
import {
  ASSIGNMENT_STATUS,
  getAuditTypeLabel,
  getEvaluationModeLabel,
  isActiveAssignmentStatus,
} from '@/constants';
import { formatAssignmentStatusLabel, formatStatusLabel, isPendingAssignmentStatus } from '@/utils';
import ModelSelectionModal from '../../../ai-maker/[orgId]/evaluations/components/ModelSelectionModal';

const GET_AI_MODEL = `
  query GetAIModel($modelId: ID!) {
    aiModel(modelId: $modelId) {
      id
      name
      displayName
      version
      description
      modelType
      provider
      providerModelId
      organization
      supportsStreaming
      maxTokens
      supportedLanguages
      tags
      status
      isPublic
      isActive
      auditsCount
      createdAt
      updatedAt
      sectors
      geographies
      versions {
        id
        version
        isLatest
        status
        lifecycleStage
        createdAt
      }
    }
  }
`;

type AIModel = {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  modelType: string;
  provider: string;
  providerModelId: string;
  organization: string;
  supportsStreaming: boolean;
  maxTokens?: number | null;
  supportedLanguages: string[];
  tags: string[];
  status: string;
  isPublic: boolean;
  isActive: boolean;
  auditsCount: number;
  createdAt: string;
  updatedAt: string;
  sectors: string[];
  geographies: string[];
  versions: Array<{
    id: string;
    version: string;
    isLatest: boolean;
    status: string;
    lifecycleStage: string;
    createdAt: string;
  }>;
};

const modelTypeLabels: Record<string, string> = {
  TRANSLATION: 'Translation',
  TEXT_GENERATION: 'Text Generation',
  SUMMARIZATION: 'Summarisation',
  QUESTION_ANSWERING: 'Question Answering',
  SENTIMENT_ANALYSIS: 'Sentiment Analysis',
  TEXT_CLASSIFICATION: 'Text Classification',
  NAMED_ENTITY_RECOGNITION: 'Named Entity Recognition',
  TEXT_TO_SPEECH: 'Text to Speech',
  SPEECH_TO_TEXT: 'Speech to Text',
  OTHER: 'Other',
};

const providerLabels: Record<string, string> = {
  OPENAI: 'OpenAI',
  LLAMA_OLLAMA: 'Llama (Ollama)',
  LLAMA_TOGETHER: 'Llama (Together AI)',
  LLAMA_REPLICATE: 'Llama (Replicate)',
  LLAMA_CUSTOM: 'Llama (Custom)',
  CUSTOM: 'Custom API',
  HUGGINGFACE: 'HuggingFace',
};

const formatDateShort = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const GET_MY_ASSIGNMENTS_FOR_MODEL = `
  query GetMyAssignmentsForModel($modelId: String) {
    myAssignments(modelId: $modelId) {
      id
      organizationId
      modelId
      modelName
      modelVersionId
      auditorId
      auditorEmail
      auditorUsername
      status
      notes
      createdAt
    }
  }
`;

const UPDATE_ASSIGNMENT_STATUS = `
  mutation UpdateAuditorAssignmentStatus($assignmentId: ID!, $status: String!) {
    updateAuditorAssignmentStatus(assignmentId: $assignmentId, status: $status) {
      success
      message
      assignment {
        id
        status
        notes
        updatedAt
      }
    }
  }
`;

const GET_MY_EVALUATIONS = `
  query GetMyEvaluations($modelId: String, $status: String, $limit: Int) {
    myEvaluations(modelId: $modelId, status: $status, limit: $limit) {
      id
      name
      status
      auditType
      totalTests
      passedTests
      failedTests
      skippedTests
      createdAt
      startedAt
      completedAt
      modelId
      modelName
      evaluationMode
    }
  }
`;

type AuditorAssignment = {
  id: string;
  organizationId: string;
  organizationName?: string;
  modelId: string;
  modelVersionId: number;
  versionLabel?: string;
  auditorId: number;
  auditorEmail: string;
  auditorUsername: string;
  status: string;
  notes: string;
  createdAt: string;
};

type Evaluation = {
  id: string;
  name: string;
  status: string;
  auditType?: string;
  totalTests: number | null;
  passedTests: number | null;
  failedTests: number | null;
  skippedTests: number | null;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  modelId: string;
  modelName: string | null;
  evaluationMode: string;
};

const AuditorModelDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { request, isAuthenticated } = useGraphQL();
  const { user } = useAppSession();
  const locale = params?.locale || 'en';
  const modelId = params?.modelId as string;
  const highlightVersionId = searchParams.get('versionId');

  const [model, setModel] = React.useState<AIModel | null>(null);
  const [assignments, setAssignments] = React.useState<AuditorAssignment[]>([]);
  const [evaluations, setEvaluations] = React.useState<Evaluation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [evaluationModalVersionId, setEvaluationModalVersionId] = React.useState<number | null>(
    null
  );

  React.useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [modelResponse, assignmentsResponse, evaluationsResponse] = await Promise.all([
          request<{ aiModel: AIModel }>(GET_AI_MODEL, { modelId }),
          request(GET_MY_ASSIGNMENTS_FOR_MODEL, { modelId }),
          request<{ myEvaluations: Evaluation[] }>(GET_MY_EVALUATIONS, {
            modelId,
            limit: 50,
          }),
        ]);

        if (modelResponse?.aiModel) setModel(modelResponse.aiModel);
        if (assignmentsResponse?.myAssignments) {
          setAssignments(assignmentsResponse.myAssignments);
        }
        if (evaluationsResponse?.myEvaluations) {
          setEvaluations(evaluationsResponse.myEvaluations);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch model details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, modelId, request]);

  const handleUpdateStatus = async (assignmentId: string, newStatus: string) => {
    try {
      setUpdatingId(assignmentId);

      const response = await request(UPDATE_ASSIGNMENT_STATUS, {
        assignmentId,
        status: newStatus,
      });

      if (response?.updateAuditorAssignmentStatus?.success) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === assignmentId ? { ...a, status: newStatus } : a))
        );

        toast.success(`Assignment ${newStatus.toLowerCase()} successfully`);
      } else {
        toast.error(response?.updateAuditorAssignmentStatus?.message || 'Failed to update status');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error updating status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getAssignmentForVersion = (versionId: number) => {
    return assignments.find((a) => a.modelVersionId === versionId);
  };

  const handleStartEvaluation = (versionId: number) => {
    setEvaluationModalVersionId(versionId);
  };

  const evaluationModalAssignment = React.useMemo(() => {
    if (evaluationModalVersionId == null) return null;
    return getAssignmentForVersion(evaluationModalVersionId);
  }, [evaluationModalVersionId, assignments]);

  const preselectedModelForModal = React.useMemo(() => {
    if (!model || evaluationModalVersionId == null) return null;

    return {
      id: model.id,
      name: model.name,
      displayName: model.displayName,
      modelType: model.modelType,
      domain: model.sectors?.[0] ?? null,
      isPublic: model.isPublic,
      versions: model.versions
        .filter((version) => !isDeprecatedLifecycle(version.lifecycleStage))
        .map((version) => ({
          id: Number(version.id),
          version: version.version,
          isLatest: version.isLatest,
          status: version.status,
          lifecycleStage: version.lifecycleStage,
        })),
    };
  }, [model, evaluationModalVersionId]);

  const assignedVersionIds = new Set(assignments.map((a) => a.modelVersionId));
  const assignedVersions =
    model?.versions?.filter((v) => assignedVersionIds.has(parseInt(v.id))) || [];

  const columnHelper = createColumnHelper<Evaluation>();
  const evaluationColumns = [
    columnHelper.accessor('name', {
      header: 'Evaluation Name',
      cell: (info) => (
        <Link
          href={`/${locale}/dashboard/auditor/evaluations/${info.row.original.id}`}
          className="text-primary-purple hover:underline"
        >
          {info.getValue() || 'Untitled Evaluation'}
        </Link>
      ),
    }),
    columnHelper.accessor('auditType', {
      header: 'Evaluation Type',
      cell: (info) => <Badge>{getAuditTypeLabel(info.getValue())}</Badge>,
    }),
    columnHelper.accessor('evaluationMode', {
      header: 'Evaluation Mode',
      cell: (info) => <Text variant="bodySm">{getEvaluationModeLabel(info.getValue())}</Text>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const status = info.getValue();
        const colors = statusColors[status] || statusColors.DRAFT;
        return (
          <span className={`text-xs rounded-full px-2 py-1 ${colors.bg} ${colors.text}`}>
            {formatStatusLabel(status)}
          </span>
        );
      },
    }),
    columnHelper.accessor('totalTests', {
      header: 'Tests',
      cell: (info) => {
        const total = info.getValue();
        const row = info.row.original;
        const passed = row.passedTests;
        const failed = row.failedTests;

        if (!total || passed == null || failed == null) {
          return <Text variant="bodySm">--</Text>;
        }

        return (
          <div className="flex items-center gap-2">
            <div className="test-result-bar">
              <div className="test-result-pass" style={{ width: `${(passed / total) * 100}%` }} />
              <div className="test-result-fail" style={{ width: `${(failed / total) * 100}%` }} />
            </div>
            <Text variant="bodySm">
              {passed}/{total} passed
            </Text>
          </div>
        );
      },
    }),
    columnHelper.accessor('completedAt', {
      header: 'Completed on',
      cell: (info) => (
        <Text variant="bodySm">
          {info.getValue() ? formatDate(info.getValue() as string) : '--'}
        </Text>
      ),
    }),
    columnHelper.accessor('id', {
      header: 'Evaluation ID',
      cell: (info) => <span className="text-gray-600">ID #{info.getValue().slice(0, 8)}</span>,
    }),
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Spinner />
        <Text variant="bodyMd" className="text-gray-600">
          Loading model details...
        </Text>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <Text variant="bodyMd" className="text-red-600 mb-4">
          {error || 'Model not found'}
        </Text>
        <Button kind="secondary" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Back Button */}
      {/* <div className="my-3">
        <Link
          href={`/${locale}/dashboard/auditor`}
          className="inline-flex text-baseVioletSolid11 hover:underline font-medium items-center text-purple-600 hover:text-purple-800"
        >
          <IconArrowLeft size={18} color="#5746AF" className="mr-2" />
          Back to Dashboard
        </Link>
      </div> */}

      <div className="flex-1 overflow-hidden lg:py-7">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Main Content - same structure as ai-maker model detail */}
          <div className="lg:border-r border-gray-100 min-w-0 flex-1">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <Text variant="heading3xl" fontWeight="semibold">
                  {model.displayName}
                </Text>

                {/* <div className="flex flex-wrap gap-2">
                  {model.sectors?.slice(0, 1).map((sector, index) => (
                    <span key={index} className="self-start sm:self-auto">
                      <Tag
                        variation="filled"
                        fillColor={"bg-purple-200"}
                        textColor={"text-purple-800"}
                      >
                        {sector}
                      </Tag>
                    </span>
                  ))}
                  {model.tags?.slice(0, 1).map((tag, index) => (
                    <span key={index} className="self-start sm:self-auto">
                      <Tag
                        variation="filled"
                        fillColor={"bg-purple-200"}
                        textColor={"text-purple-800"}
                      >
                        {tag}
                      </Tag>
                    </span>
                  ))}
                </div> */}
              </div>

              <div className="mt-8 flex flex-col gap-2 overflow-hidden">
                <Text variant="headingXl" fontWeight="semibold" className="text-gray-900 mb-4">
                  About
                </Text>
                <div className="prose prose-sm max-w-none overflow-x-hidden break-words">
                  <RichTextRenderer content={model.description || 'No description available.'} />
                </div>
              </div>

              {/* Your Assigned Versions - ai-maker style cards, no Invite Auditors */}
              <div className="mt-8">
                <div className="mb-5 flex flex-col gap-1">
                  <Text variant="headingXl">Your Assigned Versions</Text>
                  <Text variant="bodyLg">Versions you have been invited to evaluate</Text>
                </div>

                {assignedVersions.length === 0 ? (
                  <div className="border border-gray-300 rounded-lg bg-gray-50 border-dashed p-6 text-center">
                    <Text variant="bodyMd" className="text-gray-500">
                      No versions assigned to you for this model.
                    </Text>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {assignedVersions.map((v) => {
                      const assignment = getAssignmentForVersion(parseInt(v.id));
                      const isHighlighted = highlightVersionId === v.id;
                      const colors = assignment
                        ? statusColors[assignment.status] || statusColors.PENDING
                        : statusColors.PENDING;

                      return (
                        <div
                          key={v.id}
                          className={`mt-2 flex flex-col gap-2 border-2 border-solid ${
                            isHighlighted
                              ? 'border-purple-400 ring-purple-200 ring-2'
                              : 'border-baseGraySlateSolid6'
                          } shadow-sm rounded-2 bg-white p-4 lg:mx-0 lg:p-4`}
                        >
                          {/* Header row - version name, tags: Primary, status (Accepted etc), My past evaluation */}
                          <div className="flex flex-wrap items-center justify-between gap-4 md:flex-nowrap">
                            <div className="flex flex-wrap items-center gap-4 md:flex-nowrap">
                              <div className="bg-gray-100 border border-gray-200 flex h-10 w-10 items-center justify-center rounded-full">
                                <Image
                                  src="/images/icons/version.svg"
                                  alt="Version"
                                  width={40}
                                  height={40}
                                />
                              </div>
                              <Text variant="headingMd" className="line-clamp-1">
                                Version {v.version}
                              </Text>
                              {v.isLatest && (
                                <Tag variation="filled" fillColor="#E2F5C4" textColor="#59682C">
                                  Primary
                                </Tag>
                              )}
                              {assignment && (
                                // <span
                                //   className={`px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}
                                // >
                                //   {assignment.status.replace(/_/g, " ")}
                                // </span>
                                <Tag
                                  variation="filled"
                                  fillColor={colors.bgHex}
                                  textColor={colors.textHex}
                                >
                                  {formatAssignmentStatusLabel(assignment.status)}
                                </Tag>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              {assignment && isPendingAssignmentStatus(assignment.status) && (
                                <>
                                  <Button
                                    size="slim"
                                    kind="tertiary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatus(assignment.id, ASSIGNMENT_STATUS.ACCEPTED);
                                    }}
                                    disabled={updatingId === assignment.id}
                                  >
                                    <div className="flex items-end gap-1">
                                      <IconCheck color="#5746AF" size={16} className="mr-1" />
                                      <span className="pt-0.4 text-baseVioletSolid11">Accept</span>
                                    </div>
                                  </Button>
                                  <Button
                                    size="slim"
                                    kind="tertiary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatus(assignment.id, ASSIGNMENT_STATUS.DECLINED);
                                    }}
                                    disabled={updatingId === assignment.id}
                                  >
                                    <div className="flex items-start justify-center gap-1">
                                      <IconX color="#5746AF" size={16} className="mr-1" />
                                      <span className="pt-0.4 text-baseVioletSolid11">Decline</span>
                                    </div>
                                  </Button>
                                </>
                              )}

                              {assignment && isActiveAssignmentStatus(assignment.status) && (
                                <Button
                                  size="slim"
                                  kind="tertiary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEvaluation(parseInt(v.id));
                                  }}
                                >
                                  {/* <IconPlayerPlay size={16} className="mr-1" />
                                  {assignment.status === "IN_PROGRESS"
                                    ? "Continue Evaluation"
                                    : "Start Evaluation"} */}
                                  <div className="flex items-center justify-center gap-1">
                                    <IconPlayerPlay size={16} className="mr-1" />
                                    <span className="pt-0.5">
                                      {assignment.status === ASSIGNMENT_STATUS.IN_PROGRESS
                                        ? 'Continue'
                                        : 'Start Evaluation'}
                                    </span>
                                  </div>
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Table-like details row - same as ai-maker */}
                          <div className="rounded-lg border mt-4 overflow-hidden border-baseGraySlateSolid4">
                            <div className="grid grid-cols-1 bg-baseGraySlateSolid2 md:grid-cols-3">
                              <div className="border-b md:border-b-0 md:border-r border-baseGraySlateSolid4 px-4 py-2">
                                <Text variant="bodySm" className="text-gray-500 uppercase">
                                  DATE UPDATED
                                </Text>
                              </div>
                              <div className="border-b md:border-b-0 md:border-r border-baseGraySlateSolid4 px-4 py-2">
                                <Text variant="bodySm" className="text-gray-500 uppercase">
                                  CAPABILITIES
                                </Text>
                              </div>
                              <div className="border-b md:border-b-0 border-baseGraySlateSolid4 px-4 py-2">
                                <Text variant="bodySm" className="text-gray-500 uppercase">
                                  {v.isLatest ? 'LIFECYCLE STAGE' : 'STATUS'}
                                </Text>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 bg-white md:grid-cols-3">
                              <div className="border-t md:border-t-0 md:border-r border-baseGraySlateSolid4 px-4 py-3">
                                <Text variant="bodyMd">
                                  {formatDateShort(
                                    v.createdAt || model.updatedAt || new Date().toISOString()
                                  )}
                                </Text>
                              </div>
                              <div className="border-t md:border-t-0 md:border-r border-baseGraySlateSolid4 px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  {model.supportsStreaming && <Badge>Streaming</Badge>}
                                  {model.maxTokens ? (
                                    <Badge>{`${model.maxTokens.toLocaleString()} Tokens`}</Badge>
                                  ) : null}
                                  {!model.supportsStreaming && !model.maxTokens && (
                                    <Text variant="bodyMd" className="text-gray-500">
                                      --
                                    </Text>
                                  )}
                                </div>
                              </div>
                              <div className="border-t md:border-t-0 border-baseGraySlateSolid4 px-4 py-3">
                                <Text variant="bodyMd" className="capitalize">
                                  {v.isLatest
                                    ? v.lifecycleStage.replace(/_/g, ' ')
                                    : formatStatusLabel(v.status)}
                                </Text>
                              </div>
                            </div>
                          </div>

                          {assignment?.notes && (
                            <div className="border-t mt-3 border-baseGraySlateSolid4 pt-3">
                              <Text variant="bodySm" className="text-gray-500 pr-2 uppercase">
                                INVITATION NOTES :{' '}
                              </Text>
                              <Text variant="bodyMd" className="text-gray-700 mt-1">
                                {assignment.notes}
                              </Text>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* My past evaluation - table (same as ai-maker Past Evaluations) */}
              <div className="mt-16">
                <div className="mb-6 flex items-center justify-between">
                  <Text variant="headingXl" as="h2" fontWeight="bold">
                    My past evaluation
                  </Text>
                </div>
                {evaluations.length > 0 ? (
                  <div className="bg-purple-50/30 rounded-lg border border-purple-100 overflow-hidden">
                    <DataTable
                      rows={evaluations}
                      columns={evaluationColumns}
                      hideSelection={true}
                      hideFooter={false}
                      truncate
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg border border-gray-300 flex flex-col items-center justify-center border-dashed py-12">
                    <Text variant="bodyMd" className="text-gray-500 mb-4">
                      No evaluations yet for this model.
                    </Text>
                    <Button
                      kind="primary"
                      onClick={() => {
                        if (assignedVersions[0]) {
                          handleStartEvaluation(parseInt(assignedVersions[0].id));
                        } else {
                          router.push(
                            `/${locale}/dashboard/auditor/evaluations/new?modelId=${modelId}`
                          );
                        }
                      }}
                      className="text-base rounded-[8px] bg-primaryPurple2 px-8 py-3 font-bold text-white hover:bg-[#6849EE] hover:text-white"
                    >
                      Start First Evaluation
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ABOUT THE MODEL - commented out */}
          {false && model && (
            <div className="w-full shrink-0 lg:w-80">
              <div className="flex flex-col gap-5 lg:gap-10">
                <div className="flex flex-col gap-2">
                  <Text variant="headingLg" fontWeight="semibold" className="text-primary-purple">
                    ABOUT THE MODEL
                  </Text>

                  <Text variant="bodyLg" className="uppercase">
                    METADATA
                  </Text>
                </div>

                <Divider />

                <div className="flex flex-col gap-8">
                  <div className="flex items-center gap-2">
                    <Text
                      variant="bodyMd"
                      className="text-gray-500 min-w-[120px] basis-1/4 uppercase"
                    >
                      Organization
                    </Text>
                    <Tooltip content={model?.organization || 'N/A'}>
                      <Text
                        variant="bodyLg"
                        fontWeight="medium"
                        className="text-gray-900 line-clamp-2"
                      >
                        {model?.organization || 'N/A'}
                      </Text>
                    </Tooltip>
                  </div>

                  <div className="flex items-center gap-2">
                    <Text
                      variant="bodyMd"
                      className="text-gray-500 min-w-[120px] basis-1/4 uppercase"
                    >
                      Model Type
                    </Text>
                    <Text variant="bodyLg" fontWeight="medium" className="text-gray-900">
                      {model ? (modelTypeLabels[model!.modelType] ?? model!.modelType) : null}
                    </Text>
                  </div>

                  <div className="flex items-center gap-2">
                    <Text
                      variant="bodyMd"
                      className="text-gray-500 min-w-[120px] basis-1/4 uppercase"
                    >
                      Source
                    </Text>
                    <Text variant="bodyLg" fontWeight="medium" className="text-gray-900">
                      {model ? (providerLabels[model!.provider] ?? model!.provider) : null}
                    </Text>
                  </div>

                  <div className="flex gap-2">
                    <Text
                      variant="bodyMd"
                      className="text-gray-500 min-w-[120px] basis-1/4 uppercase"
                    >
                      Sector
                    </Text>
                    <div className="flex flex-wrap gap-2">
                      {(model?.sectors?.length ?? 0) > 0 ? (
                        model!.sectors!.map((sector, idx) => (
                          <Tooltip content={sector} key={idx}>
                            <div className="border border-gray-200 rounded flex h-[52px] w-[52px] items-center justify-center bg-white p-1">
                              <span className="text-xs text-gray-400 text-center font-bold">
                                {sector.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                          </Tooltip>
                        ))
                      ) : (
                        <Text variant="bodyLg" className="text-gray-900">
                          General
                        </Text>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Text
                      variant="bodyMd"
                      className="text-gray-500 min-w-[120px] basis-1/4 uppercase"
                    >
                      Geography
                    </Text>
                    <div className="flex flex-wrap gap-2">
                      {(model?.geographies?.length ?? 0) > 0 ? (
                        model!.geographies!.map((geo, idx) => (
                          <Tag key={idx} variation="filled" fillColor="#F3EFFF" textColor="#6941C6">
                            {geo}
                          </Tag>
                        ))
                      ) : (
                        <div className="flex gap-1">
                          <Tag variation="filled" fillColor="#F3EFFF" textColor="#6941C6">
                            India
                          </Tag>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {evaluationModalAssignment && evaluationModalVersionId != null && (
        <ModelSelectionModal
          open={evaluationModalVersionId != null}
          onOpenChange={(open) => {
            if (!open) {
              setEvaluationModalVersionId(null);
            }
          }}
          orgId={evaluationModalAssignment.organizationId}
          preselectedModelId={modelId}
          preselectedVersionId={evaluationModalVersionId}
          preselectedModel={preselectedModelForModal}
          lockModelSelection
          variant="auditor"
        />
      )}
    </>
  );
};

export default AuditorModelDetailPage;
