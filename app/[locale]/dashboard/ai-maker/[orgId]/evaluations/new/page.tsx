"use client";

import { useParams, useSearchParams } from "next/navigation";
import NewEvaluationContent from "../components/NewEvaluationContent";

const NewAuditPage = () => {
  const searchParams = useSearchParams();
  const params = useParams();
  const orgId = params?.orgId as string;
  const fromAuditor = searchParams.get("fromAuditor") === "true";

  return (
    <NewEvaluationContent 
      orgId={orgId} 
      fromAuditor={fromAuditor} 
    />
  );
};

export default NewAuditPage;
