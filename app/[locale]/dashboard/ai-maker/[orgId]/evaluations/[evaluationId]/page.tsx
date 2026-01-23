"use client";

import { useParams } from "next/navigation";
import EvaluationDetail from "../../../../components/EvaluationDetail";



const EvaluationDetailPage = () => {
  const params = useParams();
  const evaluationId = params?.evaluationId as string;
  const locale = params?.locale || "en";
  const orgId = params?.orgId as string;

  return (
    <EvaluationDetail
      evaluationId={evaluationId}
      backLink={`/${locale}/dashboard/ai-maker/${orgId}/evaluations`}
      backLinkText="Back to List"
      newEvaluationLink={`/${locale}/dashboard/ai-maker/${orgId}/evaluations/new`}
      orgId={orgId}
    />
  );
};

export default EvaluationDetailPage;
