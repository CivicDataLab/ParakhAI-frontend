"use client";

import { useParams } from "next/navigation";
import EvaluationDetail from "../../../components/EvaluationDetail";

const AuditorEvaluationDetailPage = () => {
  const params = useParams();
  const evaluationId = params?.evaluationId as string;
  const locale = params?.locale || "en";

  return (
    <EvaluationDetail
      evaluationId={evaluationId}
      backLink={`/${locale}/dashboard/auditor/evaluations`}
      backLinkText="Back to Evaluations"
    />
  );
};

export default AuditorEvaluationDetailPage;
