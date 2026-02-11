"use client";

import RichTextRenderer from "@/components/RichTextRenderer";
import { useGraphQL } from "@/lib/api";
import { createColumnHelper } from "@tanstack/react-table";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    Avatar,
    Badge,
    Button,
    DataTable,
    Spinner,
    Tag,
    Text
} from "opub-ui";
import React from "react";
import AuditorInvitation from "../../evaluations/components/AuditorInvitation";
import { useOrganization } from "../../OrganizationContext";

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

const GET_EVALUATIONS = `
  query GetEvaluations($modelId: ID, $limit: Int) {
    audits(modelId: $modelId, limit: $limit) {
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
      modelName
      requestedByName
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
  modelName: string | null;
  requestedByName: string | null;
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

const auditTypeLabels: Record<string, string> = {
  TECHNICAL_AUDIT: "Technical",
  DOMAIN_AUDIT: "Domain",
  CULTURAL_AUDIT: "Cultural",
};

const dataspaceUrl = process.env.NEXT_PUBLIC_DATASPACE_API_URL || "";

// Helper for formatted date
const formatDate = (dateString: string) => {
  return new Date(dateString)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, " / ");
};

// Helper for formatted date (Short)
const formatDateShort = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const ModelDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { request, isAuthenticated } = useGraphQL();
  const locale = params?.locale || "en";
  const orgId = params?.orgId as string;
  const modelId = params?.modelId as string;

  const [model, setModel] = React.useState<AIModel | null>(null);
  const [evaluations, setEvaluations] = React.useState<Evaluation[]>([]);
  const { organization } = useOrganization();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Auditor invitation state
  const [selectedVersionForAuditor, setSelectedVersionForAuditor] =
    React.useState<{
      id: number;
      version: string;
    } | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [modelResponse, evalResponse] = await Promise.all([
          request<{ aiModel: AIModel }>(GET_AI_MODEL, { modelId }, { organization: orgId }),
          request<{ audits: Evaluation[] }>(GET_EVALUATIONS, {
            modelId,
            limit: 10,
          }, { organization: orgId }),
        ]);

        if (modelResponse?.aiModel) setModel(modelResponse.aiModel);
        if (evalResponse?.audits) setEvaluations(evalResponse.audits);
      } catch (err: any) {
        setError(err.message || "Failed to fetch model details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, modelId, orgId, request]);

  const handleNewEvaluation = (versionId?: string) => {
    let url = `/${locale}/dashboard/ai-maker/${orgId}/evaluations/new?modelId=${modelId}`;
    if (versionId) {
      url += `&versionId=${versionId}`;
    }
    router.push(url);
  };

  const columnHelper = createColumnHelper<Evaluation>();
  const columns = [
    columnHelper.accessor("name", {
      header: "Evaluation Name",
      cell: (info) => (
        <Link
          href={`/${locale}/dashboard/ai-maker/${orgId}/evaluations/${info.row.original.id}`}
          className="text-primary-purple hover:underline"
        >
          {info.getValue() || "Untitled Evaluation"}
        </Link>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Evaluation Time",
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor("id", {
      header: "Evaluation ID",
      cell: (info) => (
        <span className="text-gray-600">ID #{info.getValue().slice(0, 8)}</span>
      ),
    }),
    columnHelper.accessor("auditType", {
      header: "Type",
      cell: (info) => {
        const typeValue = info.getValue();
        return (
          <Text variant="bodyMd" fontWeight="medium">
            {auditTypeLabels[typeValue || ""] || "Technical"}
          </Text>
        );
      },
    }),
    // columnHelper.accessor("requestedByName", {
    //   header: "Expert",
    //   cell: (info) => (
    //     <div className="flex items-center gap-2">
    //       <Avatar
    //         showInitials
    //         name={info.getValue() || "Expert"}
    //         size="extraSmall"
    //       />
    //       <Text variant="bodySm">{info.getValue() || "Unknown"}</Text>
    //     </div>
    //   ),
    // }),
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-screen">
        <Spinner />
        <Text variant="bodyMd" className="text-gray-600">
          Loading model details...
        </Text>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Text variant="bodyMd" className="text-red-600">
          {error || "Model not found"}
        </Text>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 lg:py-10 overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0  lg:border-r border-gray-100">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <Text variant="heading3xl" fontWeight="semibold">
                  {model.displayName}
                </Text>

                {/* <div className="flex flex-wrap gap-2">
                  {model.tags?.slice(0, 2).map((tag, index) => (
                    <span className="self-start sm:self-auto">
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

              <div className="overflow-hidden flex flex-col gap-2 mt-8">
                <Text
                  variant="headingXl"
                  fontWeight="semibold"
                  className="mb-4 text-gray-900"
                >
                  About
                </Text>
                <div className="prose prose-sm max-w-none overflow-x-hidden break-words">
                  <RichTextRenderer
                    content={model.description || "No description available."}
                  />
                </div>
              </div>

              <div className="mt-8">
                <div className="flex flex-col gap-1 mb-5">
                  <Text variant="headingXl">Versions</Text>
                  {/* <Text variant="bodyLg">
                    All versions linked to DataSpace and available for public
                    viewing
                  </Text> */}
                </div>

                <div className="flex flex-col gap-4">
                  {(model.versions || []).map((v) => (
                    <div
                      key={v.id}
                      className="mt-2 flex flex-col gap-2 border-solid border-2 border-baseGraySlateSolid6 bg-white bg-white p-4 rounded-2 lg:mx-0 lg:p-4 shadow-sm"
                    >
                      {/* Header row - version name, badges, actions */}
                      <div className="flex flex-wrap items-center justify-between gap-4 md:flex-nowrap ">
                        <div className="flex flex-wrap items-center gap-4 md:flex-nowrap">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 border border-gray-200">
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
                            <Tag
                              variation="filled"
                              fillColor="#E2F5C4" // light violet
                              textColor="#59682C" // darker violet
                            >
                              Primary
                            </Tag>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            style={{ textDecoration: "none" }}
                            className="prompt-add-filters-link no-underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNewEvaluation(v.id);
                            }}
                          >
                            Start Evaluation
                          </button>

                          <button
                            type="button"
                            style={{ textDecoration: "none" }}
                            className="prompt-add-filters-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVersionForAuditor({
                                id: parseInt(v.id),
                                version: v.version,
                              });
                            }}
                          >
                            Invite Auditors
                          </button>
                        </div>
                      </div>

                      {/* Details row - table-like layout */}
                      <div className="mt-4 rounded-lg border border-baseGraySlateSolid4 overflow-hidden">
                        {/* Header row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 bg-baseGraySlateSolid2">
                          <div className="px-4 py-2 border-b md:border-b-0 md:border-r border-baseGraySlateSolid4">
                            <Text
                              variant="bodySm"
                              className="uppercase text-gray-500"
                            >
                              DATE UPDATED
                            </Text>
                          </div>
                          <div className="px-4 py-2 border-b md:border-b-0 md:border-r border-baseGraySlateSolid4">
                            <Text
                              variant="bodySm"
                              className="uppercase text-gray-500"
                            >
                              CAPABILITIES
                            </Text>
                          </div>
                          <div className="px-4 py-2 border-b md:border-b-0 border-baseGraySlateSolid4">
                            <Text
                              variant="bodySm"
                              className="uppercase text-gray-500"
                            >
                              {v.isLatest ? "LIFECYCLE STAGE" : "STATUS"}
                            </Text>
                          </div>
                        </div>

                        {/* Values row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 bg-white">
                          <div className="px-4 py-3 border-t md:border-t-0 md:border-r border-baseGraySlateSolid4">
                            <Text variant="bodyMd">
                              {formatDateShort(
                                v.createdAt ||
                                  model.updatedAt ||
                                  new Date().toISOString()
                              )}
                            </Text>
                          </div>

                          <div className="px-4 py-3 border-t md:border-t-0 md:border-r border-baseGraySlateSolid4">
                            <div className="flex flex-wrap gap-2">
                              {model.supportsStreaming && (
                                <Badge>Streaming</Badge>
                              )}
                              {model.maxTokens ? (
                                <Badge>
                                  {`${model.maxTokens.toLocaleString()} Tokens`}
                                </Badge>
                              ) : null}
                              {!model.supportsStreaming && !model.maxTokens && (
                                <Text
                                  variant="bodyMd"
                                  className="text-gray-500"
                                >
                                  --
                                </Text>
                              )}
                            </div>
                          </div>

                          <div className="px-4 py-3 border-t md:border-t-0 border-baseGraySlateSolid4">
                            <Text variant="bodyMd" className="capitalize">
                              {v.isLatest
                                ? v.lifecycleStage.replace(/_/g, " ")
                                : v.status.replace(/_/g, " ")}
                            </Text>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(model.versions || []).length === 0 && (
                    <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
                      <Text variant="bodyMd" className="text-gray-500">
                        No version information available for this model.
                      </Text>
                    </div>
                  )}
                </div>

                <div></div>
              </div>
            </div>
          </div>

          {/* <div
            className="w-full lg:w-80 border-s-2 border-solid pl-4 pt-2 border-baseGraySlateSolid4 shrink-0"
            dir="ltr"
          >
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
                {organization && (
                  <div className="rounded-lg border border-gray-200 p-2 lg:block">
                    <div className="flex justify-center items-center h-[100px]">
                      {organization.logoUrl ? (
                        <Image
                          src={`${dataspaceUrl.replace(/\/$/, "")}${organization.logoUrl}`}
                          alt={organization.name}
                          width={100}
                          height={100}
                          className="object-contain max-h-full"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-xl">
                          {organization.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Text
                    variant="bodyMd"
                    className="min-w-[120px] basis-1/4 uppercase text-gray-500"
                  >
                    Organization
                  </Text>
                  <Tooltip
                    content={model.organization || organization?.name || "N/A"}
                  >
                    <Text
                      variant="bodyLg"
                      fontWeight="medium"
                      className="text-gray-900 line-clamp-2"
                    >
                      {model.organization || organization?.name || "N/A"}
                    </Text>
                  </Tooltip>
                </div>

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

                <div className="flex items-center gap-2">
                  <Text
                    variant="bodyMd"
                    className="min-w-[120px] basis-1/4 uppercase text-gray-500"
                  >
                    Views
                  </Text>
                  <Text
                    variant="bodyLg"
                    fontWeight="medium"
                    className="text-gray-900"
                  >
                    200+
                  </Text>
                </div>

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

                <div className="flex gap-2">
                  <Text
                    variant="bodyMd"
                    className="min-w-[120px] basis-1/4 uppercase text-gray-500"
                  >
                    License
                  </Text>
                  <Text
                    variant="bodyLg"
                    fontWeight="medium"
                    className="text-gray-900"
                  >
                    Creative Commons Attribution License (cc-by)
                  </Text>
                </div>

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
                        <Tag
                          variation="filled"
                          fillColor="#F3EFFF"
                          textColor="#6941C6"
                        >
                          Asia
                        </Tag>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div> */}
        </div>

        {/* Recent Evaluations Section */}
        <div className="mt-16">
          <div className="flex justify-between items-center mb-6">
            <Text variant="headingXl" as="h2" fontWeight="bold">
              Past Evaluations
            </Text>
          </div>
          {evaluations.length > 0 ? (
            <div className="bg-purple-50/30 rounded-lg overflow-hidden border border-purple-100">
              <DataTable
                rows={evaluations}
                columns={columns}
                hideSelection={true}
                hideFooter={false}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <Text variant="bodyMd" className="text-gray-500 mb-4">
                No evaluations yet for this model.
              </Text>
              <Button
                kind="primary"
                onClick={() => handleNewEvaluation()}
                className="bg-primaryPurple2 hover:bg-[#6849EE] text-white hover:text-white px-8 py-3 rounded-[8px] font-bold text-base"
              >
                Start First Evaluation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Auditor Invitation Modal */}
      {selectedVersionForAuditor && (
        <AuditorInvitation
          organizationId={orgId}
          modelId={modelId}
          modelVersionId={selectedVersionForAuditor.id}
          onAssignmentCreated={() => {
            // Optionally refresh data or show success message
          }}
          isOpen={!!selectedVersionForAuditor}
          onClose={() => setSelectedVersionForAuditor(null)}
          versionLabel={selectedVersionForAuditor.version}
        />
      )}
    </>
  );
};

export default ModelDetailPage;
