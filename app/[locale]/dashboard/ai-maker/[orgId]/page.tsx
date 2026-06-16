"use client";

import { Icons } from "@/components/icons";
import { useGraphQL } from "@/lib/api";
import { getEvaluationStatusColor } from "@/lib/statusColors";
import { formatStatusLabel, stripMarkdown } from "@/lib/utils";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertDialog,
  Badge,
  Button,
  Card,
  DataTable,
  Spinner,
  Text,
} from "opub-ui";
import { useEffect, useMemo, useState } from "react";
import { useOrganization } from "./OrganizationContext";
import ModelSelectionModal from "./evaluations/components/ModelSelectionModal";
import "./evaluations/evaluations-page.css";

// Define evaluation data type
type Evaluation = {
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
  successRate: number;
};

const auditTypeLabels: Record<string, string> = {
  TECHNICAL_AUDIT: "Technical",
  DOMAIN_AUDIT: "Domain",
  CULTURAL_AUDIT: "Cultural",
};

type AIModel = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  auditsCount: number;
  createdAt: string;
  updatedAt: string;
  testCasesCount: number;
  modelType: string;
};

const AUDIT_METRICS_QUERY = `
      query AuditMetrics {
        auditMetrics {
          evaluationRuns
          testCasesCount
          models
          issuesFlagged
        }
      }
    `;

type AuditMetrics = {
  evaluationRuns: number;
  testCasesCount: number;
  models: number;
  issuesFlagged: number;
};

const AIMakerDashboard = () => {
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale || "en";
  const orgId = params?.orgId as string;

  // Build URL to organization's AI models tab.
  const { organization } = useOrganization();
  const orgSlug = encodeURIComponent(
    String(organization?.slug ?? orgId ?? "").trim()
  );

  const inAppPath = `/${locale}/dashboard/ai-maker/${orgId}/ai-models`;

  // External (CivicDataSpace): /dashboard/organization/{orgSlug}/aimodels?tab=registered
  // e.g. https://dev.civicdataspace.in/dashboard/organization/civicdatalab/aimodels?tab=registered
  const externalHost =
    process.env.NEXT_PUBLIC_DATASPACE_HOST ||
    process.env.NEXT_PUBLIC_AI_MAKER_URL ||
    "";
  const externalPath =
    orgSlug
      ? `/dashboard/organization/${orgSlug}/aimodels?tab=registered`
      : "";
  let externalUrl = "";
  if (externalHost.trim() !== "" && externalPath) {
    const host = externalHost.replace(/\/$/, "");
    if (/\/dashboard$/.test(host)) {
      externalUrl = `${host}${externalPath.replace(/^\/dashboard/, "")}`;
    } else {
      externalUrl = `${host}${externalPath}`;
    }
  }

  const addModelUrl = externalUrl || inAppPath;
  const [auditMetrics, setAuditMetrics] = useState<AuditMetrics | null>(null);

  // GraphQL queries
  const GET_AI_MODELS = `
    query GetAIModels($limit: Int) {
      aiModels(limit: $limit) {
        id
        name
        displayName
        version
        description
        auditsCount
        testCasesCount
        createdAt
        updatedAt
        modelType
      }
    }
  `;

  const GET_EVALUATIONS = `
     query GetAudits($limit: Int, $offset: Int) {
    audits(limit: $limit, offset: $offset, filters: null, sortOptions: null) {
      data{
      id
      name
      modelId
      modelName
      status
      modules
      metrics
      evaluationMode
      auditType
      totalTests
      passedTests
      failedTests
      createdAt
      startedAt
      completedAt
    }
    totalItemsCount
  }
}
  `;

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

  // GraphQL hook
  const { request } = useGraphQL();

  // State for data and loading
  const [models, setModels] = useState<AIModel[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRedirectPrompt, setShowRedirectPrompt] = useState(false);

  const formatEvaluationDate = (dateString: string | null) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [modelsResponse, evaluationsResponse] = await Promise.all([
          request(GET_AI_MODELS, { limit: 100 }, { organization: orgId }),
          request(GET_EVALUATIONS, { limit: 100,offset: 0 }, { organization: orgId }),
        ]);
        const auditMetricsResponse = await request(
          AUDIT_METRICS_QUERY,
          {},
          { organization: orgId }
        );
        const auditMetrics = auditMetricsResponse?.auditMetrics || [];
        setAuditMetrics(auditMetrics);

        const modelsData = modelsResponse?.aiModels || [];
        const evaluationsData = evaluationsResponse?.audits.data || [];

        setModels(modelsData);
        setEvaluations(evaluationsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [request, orgId]);

  const hasModels = models.length > 0;

  const recentModels = useMemo(
    () =>
      [...models]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 6),
    [models],
  );

  const recentEvaluations = useMemo(
    () =>
      [...evaluations]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5),
    [evaluations],
  );

  const hasEvaluations = recentEvaluations.length > 0;

  const metrics = [
    {
      label: "Evaluations\nCompleted",
      value: auditMetrics?.evaluationRuns.toString() || "--",
    },
    {
      label: "Test Cases Evaluated",
      value: auditMetrics?.testCasesCount.toString() || "--",
    },
    { label: "Models Added", value: auditMetrics?.models.toString() || "--" },
    {
      label: "Issues\nFlagged",
      value: auditMetrics?.issuesFlagged.toString() || "--",
    },
  ];

  const handleCardClick = (modelId: string) => {
    router.push(`/${locale}/dashboard/ai-maker/${orgId}/ai-models/${modelId}`);
  };

  const getAuditLink = (evaluation: Evaluation) => {
    if (evaluation.status?.toUpperCase() === "DRAFT") {
      return `/${locale}/dashboard/ai-maker/${orgId}/evaluations/new?auditId=${evaluation.id}`;
    }
    return `/${locale}/dashboard/ai-maker/${orgId}/evaluations/${evaluation.id}`;
  };

  const columnHelper = createColumnHelper<Evaluation>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Evaluation Name",
        cell: (info) => (
          <Link
            href={getAuditLink(info.row.original)}
            className="text-primary-purple hover:underline font-medium"
          >
            {info.getValue() || `Evaluation #${info.row.original.id.slice(0, 8)}`}
          </Link>
        ),
      }),
      columnHelper.accessor("modelName", {
        header: "Model",
        cell: (info) => (
          <Text variant="bodySm">
            {info.getValue() ||
              `Model ${info.row.original.modelId?.slice(0, 8) || "-"}`}
          </Text>
        ),
      }),
      columnHelper.accessor("auditType", {
        header: "Evaluation Type",
        cell: (info) => {
          const typeValue = info.getValue();
          const label = typeValue
            ? auditTypeLabels[typeValue] || typeValue
            : "--";
          return <Badge>{label}</Badge>;
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          const colors = getEvaluationStatusColor(status);
          return (
            <Text
              variant="bodySm"
              as="span"
              className="inline-block rounded px-2 py-0.5"
              style={{
                backgroundColor: colors.fillColor,
                color: colors.textColor,
              }}
            >
              {formatStatusLabel(status)}
            </Text>
          );
        },
      }),
      columnHelper.accessor("evaluationMode", {
        header: "Evaluation Mode",
        cell: (info) => {
          const mode = info.getValue()?.toLowerCase();
          const label =
            mode === "manual"
              ? "Playground Evaluation"
              : mode === "bulk" || mode === "automated"
                ? "Bulk Evaluation"
                : info.getValue() || "--";
          return <Text variant="bodySm">{label}</Text>;
        },
      }),
      columnHelper.accessor("totalTests", {
        header: "Tests",
        cell: (info) => {
          const total = info.getValue() || 0;
          const passed = info.row.original.passedTests || 0;
          const failed = info.row.original.failedTests || 0;

          if (!total || passed == null || failed == null) {
            return <Text variant="bodySm">--</Text>;
          }

          return (
            <div className="flex items-center gap-2">
              <div className="test-result-bar">
                <div
                  className="test-result-pass"
                  style={{ width: `${(passed / total) * 100}%` }}
                />
                <div
                  className="test-result-fail"
                  style={{ width: `${(failed / total) * 100}%` }}
                />
              </div>
              <Text variant="bodySm">
                {passed}/{total} passed
              </Text>
            </div>
          );
        },
      }),
      columnHelper.accessor("completedAt", {
        header: "Completed on",
        cell: (info) => (
          <Text variant="bodySm">{formatEvaluationDate(info.getValue())}</Text>
        ),
      }),
    ],
    [locale, orgId],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-screen">
        <Spinner />
        <Text variant="bodyMd" className="text-gray-600">
          Loading overview...
        </Text>
      </div>
    );
  }

  return (
    <>
      {/* Header with Title */}
      <div className="flex items-center justify-between mb-6 mt-10 w-full">
        <div>
          <h1 className="text-gray-900 overview-heading">Overview</h1>
          <Text variant="bodySm" className="text-gray-600 mt-1">
            Monitor evaluation activity, models, and key metrics for your
            organization
          </Text>
        </div>
      </div>

      {/* Metrics */}
      <div className="overview-metrics-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8 sm:mb-10 lg:mb-12 w-full min-w-0">
        {metrics.map((m) => (
          <div key={m.label} className="metric-card">
            <p className="metric-card-label">{m.label}</p>
            <p className="metric-card-value">{m.value}</p>
          </div>
        ))}
      </div>
      {/* Models Section */}
      <div className="section-margin-bottom">
        <div className="flex items-center justify-between section-title-margin">
          <Text variant="headingLg" as="h2" fontWeight="bold">
            Recently Added Models
          </Text>
          {hasModels && (
            <div className="add-model-button-wrapper">
              <Button
                onClick={() => setShowRedirectPrompt(true)}
                className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-medium text-base"
              >
                Add A New Model
              </Button>
            </div>
          )}
        </div>
        {hasModels ? (
          <div className="grid grid-cols-1 w-full gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentModels.map((model) => {
              // Card metadata (top row inside card)
              const metadataContent = [
                {
                  icon: Icons.testPipe,
                  label: "Test Cases",
                  value: `${model.testCasesCount || 0} test cases`,
                  tooltip: `${model.testCasesCount || 0} test cases`,
                },
                {
                  icon: Icons.discountCheck,
                  label: "Audits",
                  value: `${model.auditsCount || 0} evaluations`,
                  tooltip: `${model.auditsCount || 0} evaluations`,
                },
              ] as any;

              // Card footer info (bottom row inside card)
              const footerContent = [
                {
                  icon: "/images/icons/Ellipse 4.png",
                  label: "Owner",
                  tooltip: "Owner",
                },
              ];

              const type = [
                modelTypeLabels[model.modelType] || model.modelType,
              ].map((tag: string) => ({
                label: tag,
                fillColor: "#E2F5C4",
                borderColor: "#E2F5C4",
              }));

              const commonProps = {
                title: model.displayName,
                description: stripMarkdown(model.description || ""),
                variation: "collapsed" as const,
                iconColor: "highlight" as const,
                metadataContent,

                // footerContent,
                type,
              };

              return (
                <div
                  key={model.id}
                  className="w-full cursor-pointer"
                  onClick={() => handleCardClick(model.id)}
                >
                  <Card {...commonProps} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ai-maker-empty-state">
            <div className="ai-maker-empty-icon">
              <img
                src="/images/icons/mood-empty.png"
                alt="No models"
                width={70}
                height={70}
              />
            </div>
            <Text as="p" className="ai-maker-empty-title">
              You have no registered AI models.
              <br />
              Register your first model to get started!
            </Text>
            <Button
              onClick={() => setShowRedirectPrompt(true)}
              className="bg-primaryPurple2 hover:!bg-[#6849EE] text-white hover:text-white px-8 py-3 rounded-[8px] font-bold text-base"
            >
              Add A New Model
            </Button>
          </div>
        )}
      </div>

      {/* Audits Table Section */}
      <div className="audits-section">
        <div className="flex justify-between items-center mb-4">
          <Text variant="headingLg" as="h2">
            Recent Evaluations
          </Text>
          <Link
            href={`/${locale}/dashboard/ai-maker/${orgId}/evaluations`}
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            See all
            <Icons.arrowRight size={16} className="text-blue-600" stroke={2} />
          </Link>
        </div>
        {hasEvaluations ? (
          <div className="evaluations-table-evaluation-mode-col">
            <DataTable
              rows={recentEvaluations}
              columns={columns}
              hoverable
              hideSelection
              hideFooter
              truncate
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg">
            <Text variant="bodySm" className="text-gray-600 mb-4">
              No evaluations yet. Start by running your first evaluation.
            </Text>
            <Button
              kind="primary"
              onClick={() => setIsModalOpen(true)}
              className="bg-primaryPurple2 hover:!bg-[#6849EE] text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold text-base"
            >
              Start New Evaluation
            </Button>
          </div>
        )}
      </div>

      {/* Redirect confirmation */}
      <AlertDialog open={showRedirectPrompt} onOpenChange={setShowRedirectPrompt}>
        <AlertDialog.Content
          title="Redirect to CivicDataSpace"
          primaryAction={{
            content: "Yes, continue",
            onAction: () => {
              setShowRedirectPrompt(false);
              if (externalUrl) {
                window.open(addModelUrl, "_blank", "noopener,noreferrer");
              } else {
                router.push(addModelUrl);
              }
            },
            className:
              "bg-primaryPurple2 hover:bg-[#6849EE] text-white hover:text-white",
          } as any}
          secondaryActions={[
            {
              content: "No",
              onAction: () => setShowRedirectPrompt(false),
              className:
                "bg-primaryPurple2 hover:bg-[#6849EE] text-white hover:text-white",
            } as any,
          ]}
        >
          You are being redirected to CivicDataSpace to add a model. Do you want
          to continue?
        </AlertDialog.Content>
      </AlertDialog>

      {/* Model Selection Modal */}
      <ModelSelectionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        orgId={orgId}
      />
    </>
  );
};

export default AIMakerDashboard;
