"use client";

import AuditResultsList from "@/features/dashboard/components/AuditResultsList";
import EvaluationFailedBanner from "@/features/dashboard/components/EvaluationFailedBanner";
import EvaluationProgressSection from "@/features/dashboard/components/EvaluationProgressSection";
import EvaluationSummaryCard from "@/features/dashboard/components/EvaluationSummaryCard";
import type { EvaluationDetailProps } from "@/features/dashboard/types/audit";
import {
  canShowEvaluationResults,
  formatModuleName,
  getEvaluatorLabel,
  getModeLabel,
  isAuditFailed,
} from "@/features/dashboard/utils/evaluation";
import EvaluationFormOverview from "@/app/[locale]/dashboard/ai-maker/[orgId]/evaluations/components/EvaluationFormOverview";
import ManualEvaluationFlow from "@/app/[locale]/dashboard/ai-maker/[orgId]/evaluations/components/manual-evaluation";
import RecommendationModal from "@/app/[locale]/dashboard/ai-maker/[orgId]/evaluations/components/manual-evaluation/RecommendationModal";
import { useOrganization } from "@/app/[locale]/dashboard/ai-maker/[orgId]/OrganizationContext";
import SkippedTestsErrorsCard from "@/features/dashboard/components/SkippedTestsErrorsCard";
import { Spinner, Text } from "opub-ui";
import Link from "next/link";
import { Button } from "opub-ui";
import EvaluationActions from "./EvaluationActions";
import EvaluationHeader from "./EvaluationHeader";
import { useEvaluationDetail } from "./hooks/use-evaluation-detail";

const EvaluationDetail = ({
  evaluationId,
  backLink,
  backLinkText = "Back to Evaluations",
  orgId,
}: EvaluationDetailProps) => {
  const { organization } = useOrganization();
  const {
    audit,
    auditResults,
    metricSummary,
    evaluatorRecommendation,
    modelVersion,
    editableName,
    isLoading,
    error,
    isSavingEvaluation,
    isGeneratingReport,
    isDownloading,
    showSubmitRecommendationModal,
    setEditableName,
    setShowSubmitRecommendationModal,
    saveEvaluationName,
    submitBulkReview,
    handlePrimaryActionClick,
    computed,
  } = useEvaluationDetail(evaluationId, orgId);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "--";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Spinner />
        <Text variant="bodySm" className="text-gray-600">
          Loading evaluation...
        </Text>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Text variant="bodyMd" className="text-red-600 mb-6 font-medium">
          {error || "Evaluation not found"}
        </Text>
        <Link href={backLink}>
          <Button kind="secondary">{backLinkText}</Button>
        </Link>
      </div>
    );
  }

  const {
    isPlaygroundEvaluation,
    isBulkPendingReview,
    showDownloadActions,
    isReportReady,
    isRunning,
    isPlaygroundInProgress,
    riskSummary,
    progressPercent,
    auditModelType,
    evaluationScopeDisplay,
    passRate,
    passRateColor,
  } = computed;

  return (
    <>
      <EvaluationHeader
        audit={audit}
        editableName={editableName}
        onNameChange={setEditableName}
        onNameBlur={saveEvaluationName}
        backLink={backLink}
        backLinkText={backLinkText}
      />

      <EvaluationFormOverview
        modelName={audit.modelName || "--"}
        modelVersion={modelVersion}
        organizationName={
          organization?.name ||
          (typeof audit.configuration?.organisationName === "string"
            ? audit.configuration.organisationName
            : undefined)
        }
        evalId={audit.id}
        createdAt={formatDate(audit.createdAt)}
        completedAt={formatDate(audit.completedAt)}
        scope={evaluationScopeDisplay}
        mode={getModeLabel(audit.evaluationMode)}
        evaluator={getEvaluatorLabel(audit.auditType)}
        modules={audit.modules?.map(formatModuleName).join(", ") || "--"}
        objective={
          audit.auditObjective ||
          (typeof audit.configuration?.auditObjective === "string"
            ? audit.configuration.auditObjective
            : "") ||
          "--"
        }
      />

      {isPlaygroundInProgress && orgId && (
        <ManualEvaluationFlow
          auditId={evaluationId}
          modules={audit.modules || []}
          modelType={auditModelType}
          orgId={orgId}
          onFinishAudit={() => {}}
          isRequestingAudit={false}
        />
      )}

      {isAuditFailed(audit.status) && (
        <EvaluationFailedBanner
          errorDetails={audit.errorDetails}
          errorMessage={audit.errorMessage}
        />
      )}

      {isRunning && (
        <EvaluationProgressSection progressPercent={progressPercent} />
      )}

      {(audit.status === "COMPLETED" || audit.completedAt) &&
        !isAuditFailed(audit.status) && (
          <div className="mb-8">
            <Text variant="headingMd" fontWeight="bold" className="mb-4 block">
              Evaluator&apos;s Recommendations
            </Text>
            <div className="manual-eval-input-panel bg-white p-6">
              <Text
                variant="bodyMd"
                className="whitespace-pre-wrap text-gray-800"
              >
                {evaluatorRecommendation || "No recommendations provided."}
              </Text>
            </div>
          </div>
        )}

      {canShowEvaluationResults(audit, isPlaygroundEvaluation) && (
        <EvaluationSummaryCard
          totalTests={audit.totalTests}
          passedTests={audit.passedTests}
          failedTests={audit.failedTests}
          skippedTests={audit.skippedTests}
          riskSummary={riskSummary}
          passRate={passRate}
          passRateColor={passRateColor}
        />
      )}

      {canShowEvaluationResults(audit, isPlaygroundEvaluation) && (
        <AuditResultsList
          auditId={evaluationId}
          orgId={orgId}
          isEditable={!isPlaygroundEvaluation && isBulkPendingReview}
          bannerVariant={
            isPlaygroundEvaluation || !isBulkPendingReview ? "reviewed" : "pending"
          }
          metricSummary={metricSummary as Record<string, Record<string, unknown>>}
          selectedMetricCount={audit?.metrics?.length ?? 0}
          results={auditResults}
        />
      )}

      {!isAuditFailed(audit.status) && !isPlaygroundInProgress && (
        <>
          <EvaluationActions
            showDownloadActions={showDownloadActions}
            isReportReady={isReportReady}
            isPlaygroundEvaluation={isPlaygroundEvaluation}
            isBulkPendingReview={isBulkPendingReview}
            isSavingEvaluation={isSavingEvaluation}
            isGeneratingReport={isGeneratingReport}
            isDownloading={isDownloading}
            onPrimaryAction={handlePrimaryActionClick}
            backLink={backLink}
            backLinkText={backLinkText}
          />

          {!isPlaygroundEvaluation && (audit.skippedTests || 0) > 0 && (
            <SkippedTestsErrorsCard
              errorMessage={
                audit.errorMessage?.trim() ||
                "No additional error details available."
              }
            />
          )}
        </>
      )}

      <RecommendationModal
        open={showSubmitRecommendationModal}
        onOpenChange={setShowSubmitRecommendationModal}
        title="Evaluation Recommendation"
        description="Enter your recommendation for this evaluation."
        placeholder="Enter your recommendation for this evaluation"
        onSubmit={submitBulkReview}
        isSubmitting={isSavingEvaluation}
        submitButtonText="Submit"
      />
    </>
  );
};

export default EvaluationDetail;
