"use client";

import BreadCrumbs from "@/components/Breadcrumbs";
import RichTextRenderer from "@/components/RichTextRenderer";
import { useGraphQL } from "@/lib/api";
import { createColumnHelper } from "@tanstack/react-table";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  Badge,
  Button,
  DataTable,
  Divider,
  Tag,
  Text,
  Tooltip,
} from "opub-ui";
import React from "react";
import WelcomeSection from "../../../../components/WelcomeSection";
import AuditorInvitation from "../../evaluations/components/AuditorInvitation";

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
      auditCount
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

const GET_ORG_DETAILS = `
  query GetOrgDetails($orgId: ID!) {
    organization(id: $orgId) {
      id
      name
      logoUrl
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
  auditCount: number;
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
  const [organization, setOrganization] = React.useState<{
    name: string;
    logoUrl: string | null;
  } | null>(null);
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
        const [modelResponse, evalResponse, orgResponse] = await Promise.all([
          request<{ aiModel: AIModel }>(GET_AI_MODEL, { modelId }),
          request<{ audits: Evaluation[] }>(GET_EVALUATIONS, {
            modelId,
            limit: 10,
          }),
          request<{ organization: { name: string; logoUrl: string | null } }>(
            GET_ORG_DETAILS,
            { orgId }
          ),
        ]);

        if (modelResponse?.aiModel) setModel(modelResponse.aiModel);
        if (evalResponse?.audits) setEvaluations(evalResponse.audits);
        if (orgResponse?.organization)
          setOrganization(orgResponse.organization);
      } catch (err: any) {
        setError(err.message || "Failed to fetch model details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, modelId, orgId, request]);

  const handleNewEvaluation = (version?: string) => {
    let url = `/${locale}/dashboard/ai-maker/${orgId}/evaluations/new?modelId=${modelId}`;
    if (version) {
      url += `&version=${version}`;
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
    columnHelper.accessor("requestedByName", {
      header: "Expert",
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Avatar
            showInitials
            name={info.getValue() || "Expert"}
            size="extraSmall"
          />
          <Text variant="bodySm">{info.getValue() || "Unknown"}</Text>
        </div>
      ),
    }),
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Text variant="bodyMd">Loading model details...</Text>
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
    <div className="flex flex-col min-h-screen bg-white">
      <BreadCrumbs
        data={[
          { href: "/", label: "Home" },
          { href: "/dashboard", label: "User Dashboard" },
          { href: `/${locale}/dashboard/ai-maker`, label: "AI Maker" },
          {
            href: `/${locale}/dashboard/ai-maker/${orgId}`,
            label: "Evaluations", // Assuming hierarchy from design: AI Maker Dashboard > Evaluations > Model
          },
          { href: "#", label: `Eval ID: #${model.id.slice(0, 8)}` }, // Simplified for display
        ]}
      />

      <div className="flex flex-1 gap-8 px-8 main-content-wrapper">
        <WelcomeSection
          orgName={organization?.name}
          orgLogo={organization?.logoUrl}
        />

        <div className="flex-1 p-10 bg-white">
          <div className="flex">
            {/* Main Content */}
            <div className="flex-1 pr-16 border-r border-gray-100">
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <Text variant="heading3xl" fontWeight="bold">
                    {model.displayName}
                  </Text>

                  <div className="flex flex-wrap gap-2">
                    {model.sectors?.slice(0, 1).map((sector, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-md"
                      >
                        {sector}
                      </span>
                    ))}
                    {model.tags?.slice(0, 1).map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <Text
                    variant="headingLg"
                    fontWeight="bold"
                    className="mb-4 text-gray-900"
                  >
                    About
                  </Text>
                  <RichTextRenderer
                    content={model.description || "No description available."}
                  />
                </div>

                <div className="mt-8">
                  <div className="flex flex-col gap-1 mb-5">
                    <Text variant="headingXl">Versions</Text>
                    <Text variant="bodyLg">
                      All versions linked to DataSpace and available for public
                      viewing
                    </Text>
                  </div>

                  <div className="flex flex-col gap-4">
                    {(model.versions || []).map((v) => (
                      <div
                        key={v.id}
                        className="mt-5 flex flex-col gap-6 border border-gray-200 bg-white p-4 rounded-lg lg:mx-0 lg:p-6 shadow-sm"
                      >
                        <Accordion type="single" collapsible className="w-full">
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
                              </div>

                              <div className="flex items-center gap-4">
                                <Button
                                  size="slim"
                                  kind="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNewEvaluation(v.version);
                                  }}
                                >
                                  Start Evaluation
                                </Button>

                                <Button
                                  size="slim"
                                  kind="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVersionForAuditor({
                                      id: parseInt(v.id),
                                      version: v.version,
                                    });
                                  }}
                                >
                                  Invite Auditors
                                </Button>

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
                              style={{
                                backgroundColor: "white",
                              }}
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
                                        new Date().toISOString()
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
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
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
                </div>
              </div>
            </div>

            <div className="w-80 pl-10 shrink-0">
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

                  {/* Organization */}
                  <div className="flex items-center gap-2">
                    <Text
                      variant="bodyMd"
                      className="min-w-[120px] basis-1/4 uppercase text-gray-500"
                    >
                      Organization
                    </Text>
                    <Tooltip
                      content={
                        model.organization || organization?.name || "N/A"
                      }
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

                  {/* Views (Placeholder) */}
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

                  {/* License */}
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
                              {/* Simulated sector icon since real ones might not exist in this repo */}
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
            </div>
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
                <Button kind="primary" onClick={() => handleNewEvaluation()}>
                  Start First Evaluation
                </Button>
              </div>
            )}
          </div>
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
    </div>
  );
};

export default ModelDetailPage;
