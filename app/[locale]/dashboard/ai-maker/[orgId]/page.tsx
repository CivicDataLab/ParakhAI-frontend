"use client";

import { Icons } from "@/components/icons";
import { useGraphQL } from "@/lib/api";
import { stripMarkdown } from "@/lib/utils";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppSession } from "@/lib/session";
import { Button, Card, DataTable, Spinner, Text } from "opub-ui";
import { useEffect, useMemo, useState } from "react";
import { useOrganization } from "./OrganizationContext";
import ModelSelectionModal from "./evaluations/components/ModelSelectionModal";

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
  completedAt: string;
  modelName: string | null;
  modelId: string;
  auditType: string;
  evaluationMode: string;
  successRate: number;
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

  // Build dynamic in-app URL using entityType/entitySlug (preferred).
  // Fallback to current user's slug with entityType "self" when route params are missing.
  const { user } = useAppSession();
  const entityType = (params as any)?.entityType ?? "self";
  // Safely read a slug-like value. `AppUser` type may not include `slug`,
  // so cast `user` to `any` when accessing optional properties not declared on the type.
  const rawEntitySlug =
    (params as any)?.entitySlug ??
    (user as any)?.slug ??
    (user as any)?.username ??
    (user as any)?.name ??
    orgId ??
    "";
  const entitySlug = encodeURIComponent(String(rawEntitySlug).trim());

  // If you want the link to go to the external dev site (e.g. dev.civicdataspace.in),
  // set NEXT_PUBLIC_DATASPACE_HOST or NEXT_PUBLIC_AI_MAKER_URL in your environment.
  // Otherwise the code will use an in-app path.
  const externalHost =
    process.env.NEXT_PUBLIC_DATASPACE_HOST ||
    process.env.NEXT_PUBLIC_AI_MAKER_URL ||
    "";

  const inAppPath = `/${locale}/dashboard/${entityType}/${entitySlug}/aimodels?tab=registered`;

  // Build external URL without duplicating "/dashboard" or the locale segment.
  // External path should be: /dashboard/{entityType}/{entitySlug}/aimodels?tab=registered
  const externalPath = `/dashboard/${entityType}/${entitySlug}/aimodels?tab=registered`;
  let externalUrl = "";
  if (externalHost.trim() !== "") {
    const host = externalHost.replace(/\/$/, "");
    if (/\/dashboard$/.test(host)) {
      // host already ends with /dashboard -> don't add another /dashboard
      externalUrl = `${host}${externalPath.replace(/^\/dashboard/, "")}`;
    } else {
      externalUrl = `${host}${externalPath}`;
    }
  }

  // Final URL to use in the Add button:
  // - If externalUrl is available use it (goes to dev.civicdataspace.in)
  // - Otherwise use in-app path (keeps navigation internal)
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
    query GetEvaluations($limit: Int) {
      audits(limit: $limit) {
        id
        name
        modelId
        status
        auditType
        evaluationMode
        totalTests
        passedTests
        failedTests
        skippedTests
        modelName
        successRate
        completedAt
        createdAt
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
  const { organization } = useOrganization();
  const [models, setModels] = useState<AIModel[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "--";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "--";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [modelsResponse, evaluationsResponse] = await Promise.all([
          request(GET_AI_MODELS, { limit: 10 }, { organization: orgId }),
          request(GET_EVALUATIONS, { limit: 5 }, { organization: orgId }),
        ]);
        const auditMetricsResponse = await request(
          AUDIT_METRICS_QUERY,
          {},
          { organization: orgId }
        );
        const auditMetrics = auditMetricsResponse?.auditMetrics || [];
        setAuditMetrics(auditMetrics);

        const modelsData = modelsResponse?.aiModels || [];
        const evaluationsData = evaluationsResponse?.audits || [];

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
  const hasEvaluations = evaluations.length > 0;

  const metrics = [
    {
      label: "Evaluation Runs",
      value: auditMetrics?.evaluationRuns.toString() || "--",
    },
    {
      label: "Test Cases",
      value: auditMetrics?.testCasesCount.toString() || "--",
    },
    { label: "Models", value: auditMetrics?.models.toString() || "--" },
    {
      label: "Issues Flagged",
      value: auditMetrics?.issuesFlagged.toString() || "--",
    },
  ];

  const handleCardClick = (modelId: string) => {
    router.push(`/${locale}/dashboard/ai-maker/${orgId}/ai-models/${modelId}`);
  };

  // Create column helper
  const columnHelper = createColumnHelper<Evaluation>();

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.accessor("modelName", {
        header: "Model",
        cell: (info) => {
          const modelName = info.getValue();
          return modelName ? (
            <Text variant="bodySm">{modelName}</Text>
          ) : (
            <Text variant="bodySm" className="text-gray-500">
              Unknown Model
            </Text>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Evaluation Time",
        cell: (info) => (
          <div className="ml-5">
            {new Date(info.getValue()).toLocaleDateString()}
          </div>
        ),
      }),
      columnHelper.accessor("id", {
        header: "Evaluation ID",
        cell: (info) => (
          <Link
            href={`/${locale}/dashboard/ai-maker/${orgId}/evaluations/${info.getValue()}`}
            className="text-primary-purple hover:underline"
          >
            ID #{info.getValue().slice(0, 8)}
          </Link>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
      }),
      columnHelper.accessor("auditType", {
        header: "Evaluation Type",
      }),
      columnHelper.accessor("totalTests", {
        header: "Test Result",
        cell: (info) => {
          const total = info.getValue();
          const row = info.row.original;
          const passed = row.passedTests;
          const failed = row.failedTests;

          if (!total || !passed || !failed) {
            return <Text variant="bodySm">No data</Text>;
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
    ],
    [locale, orgId]
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
      <div className="flex items-center justify-between mb-6 mt-10">
        <h1 className="text-gray-900 overview-heading">Overview</h1>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 sm:mb-10 lg:mb-12">
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
            Models
          </Text>
          {hasModels && (
            <div className="add-model-button-wrapper">
              <Link
                href={addModelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-medium text-base"
                style={{
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Add A New Model
              </Link>
            </div>
          )}
        </div>
        {hasModels ? (
          <div className="grid grid-cols-1 w-full gap-4 md:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => {
              // Card metadata (top row inside card)
              const metadataContent = [
                {
                  icon: Icons.calendar,
                  label: "Created",
                  value: formatDate(model.updatedAt),
                  tooltip: formatDate(model.updatedAt),
                },
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
            <Link
              href={addModelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primaryPurple2 hover:!bg-[#6849EE] text-white hover:text-white px-8 py-3 rounded-[8px] font-bold text-base"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              Add A New Model
            </Link>
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
            className="text-blue-600 hover:underline"
          >
            See All
          </Link>
        </div>
        {hasEvaluations ? (
          <DataTable
            rows={evaluations}
            columns={columns}
            hoverable={true}
            sortColumns={["modelName", "createdAt"]}
            defaultSortDirection="asc"
            hideSelection={true}
            hideFooter={true}
          />
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
