"use client";

import RichTextRenderer from "@/components/common/RichTextRenderer";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    Badge,
    Divider,
    Tag,
    Text,
    Tooltip,
} from "opub-ui";
import React from "react";

// Shared types
export type AIModelVersion = {
  id: string;
  version: string;
  isLatest: boolean;
  status: string;
  lifecycleStage: string;
  createdAt: string;
};

export type AIModel = {
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
  versions: AIModelVersion[];
};

// Shared constants
export const modelTypeLabels: Record<string, string> = {
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

export const providerLabels: Record<string, string> = {
  OPENAI: "OpenAI",
  LLAMA_OLLAMA: "Llama (Ollama)",
  LLAMA_TOGETHER: "Llama (Together AI)",
  LLAMA_REPLICATE: "Llama (Replicate)",
  LLAMA_CUSTOM: "Llama (Custom)",
  CUSTOM: "Custom API",
  HUGGINGFACE: "HuggingFace",
};

// Shared helper functions
export const formatDateShort = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatDate = (dateString: string) => {
  return new Date(dateString)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, " / ");
};

// Shared GraphQL query
export const GET_AI_MODEL_QUERY = `
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

// Model Header Component
interface ModelHeaderProps {
  model: AIModel;
}

export const ModelHeader: React.FC<ModelHeaderProps> = ({ model }) => (
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
);

// Model About Section Component
interface ModelAboutProps {
  description: string;
}

export const ModelAbout: React.FC<ModelAboutProps> = ({ description }) => (
  <div className="overflow-hidden">
    <Text variant="headingLg" fontWeight="bold" className="mb-4 text-gray-900">
      About
    </Text>
    <div className="prose prose-sm max-w-none overflow-x-hidden break-words">
      <RichTextRenderer content={description || "No description available."} />
    </div>
  </div>
);

// Model Sidebar Component
interface ModelSidebarProps {
  model: AIModel;
  organizationLogo?: React.ReactNode;
}

export const ModelSidebar: React.FC<ModelSidebarProps> = ({
  model,
  organizationLogo,
}) => (
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
      {organizationLogo}

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
        <Text variant="bodyLg" fontWeight="medium" className="text-gray-900">
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
        <Text variant="bodyLg" fontWeight="medium" className="text-gray-900">
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
            <Tag variation="filled" fillColor="#F3EFFF" textColor="#6941C6">
              India
            </Tag>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Version Accordion Details Component
interface VersionDetailsProps {
  version: AIModelVersion;
  model: AIModel;
  extraContent?: React.ReactNode;
}

export const VersionDetails: React.FC<VersionDetailsProps> = ({
  version,
  model,
  extraContent,
}) => (
  <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-12">
    <div className="flex flex-col gap-1">
      <Text variant="bodySm" className="uppercase text-gray-500">
        DATE UPDATED
      </Text>
      <Text variant="bodyMd">
        {formatDateShort(
          version.createdAt || model.updatedAt || new Date().toISOString(),
        )}
      </Text>
    </div>

    <div className="flex flex-col gap-1">
      <Text variant="bodySm" className="uppercase text-gray-500">
        CAPABILITIES
      </Text>
      <div className="flex gap-2">
        {model.supportsStreaming && <Badge>Streaming</Badge>}
        {model.maxTokens ? (
          <Badge>{`${model.maxTokens.toLocaleString()} Tokens`}</Badge>
        ) : null}
      </div>
    </div>

    {model.supportedLanguages && model.supportedLanguages.length > 0 && (
      <div className="flex flex-col gap-1">
        <Text variant="bodySm" className="uppercase text-gray-500">
          LANGUAGES
        </Text>
        <div className="flex gap-1 flex-wrap">
          {model.supportedLanguages.slice(0, 3).map((l) => (
            <Badge key={l}>{l.toUpperCase()}</Badge>
          ))}
          {model.supportedLanguages.length > 3 && (
            <Badge>{`+${model.supportedLanguages.length - 3}`}</Badge>
          )}
        </div>
      </div>
    )}

    {extraContent}
  </div>
);

// Version Card Header Component
interface VersionCardHeaderProps {
  version: AIModelVersion;
  statusBadge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const VersionCardHeader: React.FC<VersionCardHeaderProps> = ({
  version,
  statusBadge,
  actions,
}) => (
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
      <Text variant="headingMd" className="line-clamp-1">
        Version {version.version}
      </Text>
      {version.isLatest && <Badge status="success">Primary</Badge>}
      <Badge>{version.lifecycleStage.replace(/_/g, " ")}</Badge>
      {statusBadge}
    </div>

    <div className="flex items-center gap-4">
      {actions}
      <AccordionTrigger className="flex items-center gap-2 p-0 hover:no-underline text-gray-600">
        <Text variant="bodyLg" className="text-secondaryText">
          View Details
        </Text>
      </AccordionTrigger>
    </div>
  </div>
);

// Version Card Component
interface VersionCardProps {
  version: AIModelVersion;
  model: AIModel;
  isHighlighted?: boolean;
  statusBadge?: React.ReactNode;
  actions?: React.ReactNode;
  extraDetailsContent?: React.ReactNode;
}

export const VersionCard: React.FC<VersionCardProps> = ({
  version,
  model,
  isHighlighted = false,
  statusBadge,
  actions,
  extraDetailsContent,
}) => (
  <div
    className={`mt-2 flex flex-col gap-6 border ${
      isHighlighted
        ? "border-purple-400 ring-2 ring-purple-200"
        : "border-gray-200"
    } bg-white p-4 rounded-lg lg:mx-0 lg:p-6 shadow-sm`}
  >
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value={version.id} className="border-none">
        <VersionCardHeader
          version={version}
          statusBadge={statusBadge}
          actions={actions}
        />
        <AccordionContent
          className="flex w-full flex-col py-5 mt-4"
          style={{ backgroundColor: "white" }}
        >
          <VersionDetails
            version={version}
            model={model}
            extraContent={extraDetailsContent}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);
