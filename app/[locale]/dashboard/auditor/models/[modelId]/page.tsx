"use client";

import RichTextRenderer from "@/components/RichTextRenderer";
import { useGraphQL } from "@/lib/api";
import { useAppSession } from "@/lib/session";
import { IconArrowLeft, IconPlayerPlay, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Divider,
  Spinner,
  Tag,
  Text,
  Tooltip,
} from "opub-ui";
import React from "react";

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
  TRANSLATION: "Translation",
  TEXT_GENERATION: "Text Generation",
  SUMMARIZATION: "Summarisation",
  QUESTION_ANSWERING: "Question Answering",
  SENTIMENT_ANALYSIS: "Sentiment Analysis",
  TEXT_CLASSIFICATION: "Text Classification",
  NAMED_ENTITY_RECOGNITION: "Named Entity Recognition",
  TEXT_TO_SPEECH: "Text to Speech",
  SPEECH_TO_TEXT: "Speech to Text",
  OTHER: "Other",
};

const providerLabels: Record<string, string> = {
  OPENAI: "OpenAI",
  LLAMA_OLLAMA: "Llama (Ollama)",
  LLAMA_TOGETHER: "Llama (Together AI)",
  LLAMA_REPLICATE: "Llama (Replicate)",
  LLAMA_CUSTOM: "Llama (Custom)",
  CUSTOM: "Custom API",
  HUGGINGFACE: "HuggingFace",
};

const formatDateShort = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};


const GET_MY_ASSIGNMENTS_FOR_MODEL = `
  query GetMyAssignmentsForModel($modelId: String) {
    myAssignments(modelId: $modelId) {
      id
      organizationId
      modelId
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


const statusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-700" },
  ACCEPTED: { bg: "bg-green-100", text: "text-green-700" },
  DECLINED: { bg: "bg-red-100", text: "text-red-700" },
  IN_PROGRESS: { bg: "bg-blue-100", text: "text-blue-700" },
  COMPLETED: { bg: "bg-purple-100", text: "text-purple-700" },
};


const AuditorModelDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { request, isAuthenticated } = useGraphQL();
  const { user } = useAppSession();
  const locale = params?.locale || "en";
  const modelId = params?.modelId as string;
  const highlightVersionId = searchParams.get("versionId");

  const [model, setModel] = React.useState<AIModel | null>(null);
  const [assignments, setAssignments] = React.useState<AuditorAssignment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const [toast, setToast] = React.useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });

  React.useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [modelResponse, assignmentsResponse] = await Promise.all([
          request<{ aiModel: AIModel }>(GET_AI_MODEL, { modelId }),
          // No need to pass userId - backend uses logged-in user context
          request(GET_MY_ASSIGNMENTS_FOR_MODEL, { modelId }),
        ]);

        if (modelResponse?.aiModel) setModel(modelResponse.aiModel);
        if (assignmentsResponse?.myAssignments) {
          setAssignments(assignmentsResponse.myAssignments);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch model details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, modelId, request]);

  const handleUpdateStatus = async (
    assignmentId: string,
    newStatus: string,
  ) => {
    try {
      setUpdatingId(assignmentId);

      const response = await request(UPDATE_ASSIGNMENT_STATUS, {
        assignmentId,
        status: newStatus,
      });

      if (response?.updateAuditorAssignmentStatus?.success) {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId ? { ...a, status: newStatus } : a,
          ),
        );

        setToast({
          show: true,
          message: `Assignment ${newStatus.toLowerCase()} successfully`,
          type: "success",
        });
      } else {
        setToast({
          show: true,
          message:
            response?.updateAuditorAssignmentStatus?.message ||
            "Failed to update status",
          type: "error",
        });
      }
    } catch (err: any) {
      setToast({
        show: true,
        message: err?.message || "Error updating status",
        type: "error",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getAssignmentForVersion = (versionId: number) => {
    return assignments.find((a) => a.modelVersionId === versionId);
  };

  const handleStartEvaluation = (versionId: number) => {
    // Navigate to auditor's evaluation creation page
    router.push(
      `/${locale}/dashboard/auditor/evaluations/new?modelId=${modelId}&versionId=${versionId}`,
    );
  };

  const assignedVersionIds = new Set(assignments.map((a) => a.modelVersionId));
  const assignedVersions =
    model?.versions?.filter((v) => assignedVersionIds.has(parseInt(v.id))) ||
    [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <Spinner />
        <Text variant="bodyMd" className="text-gray-600">Loading model details...</Text>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <Text variant="bodyMd" className="text-red-600 mb-4">
          {error || "Model not found"}
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
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/auditor`}
          className="inline-flex items-center text-purple-600 hover:text-purple-800"
        >
          <IconArrowLeft size={18} className="mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex-1 p-6 lg:p-10 bg-white rounded-lg overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0 lg:pr-8 lg:border-r border-gray-100">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <Text variant="heading3xl" fontWeight="bold">
                  {model.displayName}
                </Text>

                <div className="flex flex-wrap gap-2">
                  {model.sectors?.slice(0, 2).map((sector, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-md"
                    >
                      {sector}
                    </span>
                  ))}
                  {model.tags?.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden w-full">
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  className="mb-4 text-gray-900"
                >
                  About
                </Text>
                <div className="max-w-full overflow-hidden [&_*]:max-w-full [&_*]:overflow-wrap-anywhere [&_*]:word-break-break-word" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  <RichTextRenderer
                    content={model.description || "No description available."}
                  />
                </div>
              </div>

              {/* Assigned Versions Section */}
              <div className="mt-8">
                <div className="flex flex-col gap-1 mb-5">
                  <Text variant="headingXl">Your Assigned Versions</Text>
                  <Text variant="bodyLg">
                    Versions you have been invited to evaluate
                  </Text>
                </div>

                {assignedVersions.length === 0 ? (
                  <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
                    <Text variant="bodyMd" className="text-gray-500">
                      No versions assigned to you for this model.
                    </Text>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {assignedVersions.map((v) => {
                      const assignment = getAssignmentForVersion(
                        parseInt(v.id),
                      );
                      const isHighlighted = highlightVersionId === v.id;
                      const colors = assignment
                        ? statusColors[assignment.status] ||
                          statusColors.PENDING
                        : statusColors.PENDING;

                      return (
                        <div
                          key={v.id}
                          className={`mt-2 flex flex-col gap-6 border ${
                            isHighlighted
                              ? "border-purple-400 ring-2 ring-purple-200"
                              : "border-gray-200"
                          } bg-white p-4 rounded-lg lg:mx-0 lg:p-6 shadow-sm`}
                        >
                          <Accordion
                            type="single"
                            collapsible
                            className="w-full"
                          >
                            <AccordionItem value={v.id} className="border-none">
                              <div className="flex flex-wrap items-center justify-between gap-4 md:flex-nowrap">
                                <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 border border-gray-200">
                                    <svg
                                      className="h-5 w-5 text-gray-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                  </div>
                                  <Text
                                    variant="headingMd"
                                    className="line-clamp-1"
                                  >
                                    Version {v.version}
                                  </Text>
                                  {v.isLatest && (
                                    <Badge status="success">Primary</Badge>
                                  )}
                                  <Badge>
                                    {v.lifecycleStage.replace(/_/g, " ")}
                                  </Badge>
                                  {assignment && (
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full ${colors.bg} ${colors.text}`}
                                    >
                                      {assignment.status.replace(/_/g, " ")}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-4">
                                  {assignment?.status === "PENDING" && (
                                    <>
                                      <Button
                                        size="slim"
                                        kind="primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateStatus(
                                            assignment.id,
                                            "ACCEPTED",
                                          );
                                        }}
                                        disabled={updatingId === assignment.id}
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        size="slim"
                                        kind="tertiary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateStatus(
                                            assignment.id,
                                            "DECLINED",
                                          );
                                        }}
                                        disabled={updatingId === assignment.id}
                                      >
                                        Decline
                                      </Button>
                                    </>
                                  )}

                                  {(assignment?.status === "ACCEPTED" ||
                                    assignment?.status === "IN_PROGRESS") && (
                                    <Button
                                      size="slim"
                                      kind="primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEvaluation(parseInt(v.id));
                                      }}
                                    >
                                      <IconPlayerPlay
                                        size={16}
                                        className="mr-1"
                                      />
                                      {assignment.status === "IN_PROGRESS"
                                        ? "Continue Evaluation"
                                        : "Start Evaluation"}
                                    </Button>
                                  )}

                                  <AccordionTrigger className="flex items-center gap-2 p-0 hover:no-underline text-gray-600">
                                    <Text
                                      variant="bodyLg"
                                      className="text-secondaryText"
                                    >
                                      View Details
                                    </Text>
                                  </AccordionTrigger>
                                </div>
                              </div>

                              <AccordionContent
                                className="flex w-full flex-col py-5 mt-4"
                                style={{ backgroundColor: "white" }}
                              >
                                <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-12">
                                  <div className="flex flex-col gap-1">
                                    <Text
                                      variant="bodySm"
                                      className="uppercase text-gray-500"
                                    >
                                      DATE UPDATED
                                    </Text>
                                    <Text variant="bodyMd">
                                      {formatDateShort(
                                        v.createdAt ||
                                          model.updatedAt ||
                                          new Date().toISOString(),
                                      )}
                                    </Text>
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <Text
                                      variant="bodySm"
                                      className="uppercase text-gray-500"
                                    >
                                      CAPABILITIES
                                    </Text>
                                    <div className="flex gap-2">
                                      {model.supportsStreaming && (
                                        <Badge>Streaming</Badge>
                                      )}
                                      {model.maxTokens ? (
                                        <Badge>
                                          {`${model.maxTokens.toLocaleString()} Tokens`}
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </div>

                                  {model.supportedLanguages &&
                                    model.supportedLanguages.length > 0 && (
                                      <div className="flex flex-col gap-1">
                                        <Text
                                          variant="bodySm"
                                          className="uppercase text-gray-500"
                                        >
                                          LANGUAGES
                                        </Text>
                                        <div className="flex gap-1 flex-wrap">
                                          {model.supportedLanguages
                                            .slice(0, 3)
                                            .map((l) => (
                                              <Badge key={l}>
                                                {l.toUpperCase()}
                                              </Badge>
                                            ))}
                                          {model.supportedLanguages.length >
                                            3 && (
                                            <Badge>
                                              {`+${model.supportedLanguages.length - 3}`}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  {assignment?.notes && (
                                    <div className="flex flex-col gap-1 w-full">
                                      <Text
                                        variant="bodySm"
                                        className="uppercase text-gray-500"
                                      >
                                        INVITATION NOTES
                                      </Text>
                                      <Text
                                        variant="bodyMd"
                                        className="text-gray-700"
                                      >
                                        {assignment.notes}
                                      </Text>
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="flex flex-col gap-5 lg:gap-10">
              <div className="flex flex-col gap-2">
                <Text
                  variant="headingLg"
                  fontWeight="semibold"
                  className="text-primary-purple"
                >
                  ABOUT THE MODEL
                </Text>

                <Text variant="bodyLg" className="uppercase">
                  METADATA
                </Text>
              </div>

              <Divider />

              <div className="flex flex-col gap-8">
                {/* Organization */}
                <div className="flex items-center gap-2">
                  <Text
                    variant="bodyMd"
                    className="min-w-[120px] basis-1/4 uppercase text-gray-500"
                  >
                    Organization
                  </Text>
                  <Tooltip content={model.organization || "N/A"}>
                    <Text
                      variant="bodyLg"
                      fontWeight="medium"
                      className="text-gray-900 line-clamp-2"
                    >
                      {model.organization || "N/A"}
                    </Text>
                  </Tooltip>
                </div>

                {/* Model Type */}
                <div className="flex items-center gap-2">
                  <Text
                    variant="bodyMd"
                    className="min-w-[120px] basis-1/4 uppercase text-gray-500"
                  >
                    Model Type
                  </Text>
                  <Text
                    variant="bodyLg"
                    fontWeight="medium"
                    className="text-gray-900"
                  >
                    {modelTypeLabels[model.modelType] || model.modelType}
                  </Text>
                </div>

                {/* Source */}
                <div className="flex items-center gap-2">
                  <Text
                    variant="bodyMd"
                    className="min-w-[120px] basis-1/4 uppercase text-gray-500"
                  >
                    Source
                  </Text>
                  <Text
                    variant="bodyLg"
                    fontWeight="medium"
                    className="text-gray-900"
                  >
                    {providerLabels[model.provider] || model.provider}
                  </Text>
                </div>

                {/* Sector */}
                <div className="flex gap-2">
                  <Text
                    variant="bodyMd"
                    className="min-w-[120px] basis-1/4 uppercase text-gray-500"
                  >
                    Sector
                  </Text>
                  <div className="flex flex-wrap gap-2">
                    {model.sectors?.length > 0 ? (
                      model.sectors.map((sector, idx) => (
                        <Tooltip content={sector} key={idx}>
                          <div className="w-[52px] h-[52px] border border-gray-200 p-1 rounded bg-white flex items-center justify-center">
                            <span className="text-xs text-center font-bold text-gray-400">
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

                {/* Geography */}
                <div className="flex items-center gap-2">
                  <Text
                    variant="bodyMd"
                    className="min-w-[120px] basis-1/4 uppercase text-gray-500"
                  >
                    Geography
                  </Text>
                  <div className="flex flex-wrap gap-2">
                    {model.geographies?.length > 0 ? (
                      model.geographies.map((geo, idx) => (
                        <Tag
                          key={idx}
                          variation="filled"
                          fillColor="#F3EFFF"
                          textColor="#6941C6"
                        >
                          {geo}
                        </Tag>
                      ))
                    ) : (
                      <div className="flex gap-1">
                        <Tag
                          variation="filled"
                          fillColor="#F3EFFF"
                          textColor="#6941C6"
                        >
                          India
                        </Tag>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast({ ...toast, show: false })}
            className="ml-2 hover:opacity-80"
          >
            <IconX size={16} />
          </button>
        </div>
      )}
    </>
  );
};

export default AuditorModelDetailPage;
