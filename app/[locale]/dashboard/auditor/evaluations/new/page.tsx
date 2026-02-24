"use client";

import { useGraphQL } from "@/lib/api";
import { useAppSession } from "@/lib/session";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button, Spinner, Text } from "opub-ui";
import { useEffect, useState } from "react";
import { OrganizationContext } from "../../../ai-maker/[orgId]/OrganizationContext";
import NewEvaluationContent from "../../../ai-maker/[orgId]/evaluations/components/NewEvaluationContent";

const GET_MY_ASSIGNMENTS_FOR_MODEL = `
  query GetMyAssignmentsForModel($modelId: String) {
    myAssignments(modelId: $modelId) {
      id
      organizationId
      modelId
      modelName
      modelVersionId
      status
    }
  }
`;

const GET_ORGANIZATION = `
  query GetOrganization($orgId: ID!) {
    organization(orgId: $orgId) {
      id
      name
      logoUrl
    }
  }
`;

type Assignment = {
  id: string;
  organizationId: string;
  modelId: string;
  modelName: string;
  modelVersionId: number;
  status: string;
};

const AuditorNewEvaluationPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params?.locale || "en";
  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();
  const { user } = useAppSession();

  const modelId = searchParams.get("modelId");
  const versionId = searchParams.get("versionId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validAssignment, setValidAssignment] = useState<Assignment | null>(
    null,
  );
  const [organization, setOrganization] = useState<{
    name: string;
    logoUrl: string | null;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || isSessionLoading) return;

    const checkAssignment = async () => {
      if (!modelId) {
        setError(
          "No model specified. Please select a model from your assignments.",
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await request(GET_MY_ASSIGNMENTS_FOR_MODEL, {
          modelId,
        });

        const assignments = response?.myAssignments || [];

        const assignment = assignments.find((a: any) => {
          const statusValid =
            a.status === "ACCEPTED" || a.status === "IN_PROGRESS";
          if (versionId) {
            return statusValid && a.modelVersionId === parseInt(versionId);
          }
          return statusValid;
        });

        if (assignment) {
          setValidAssignment(assignment);

          // Fetch organization details for context
          try {
            const orgResponse = await request(GET_ORGANIZATION, {
              orgId: assignment.organizationId,
            });
            if (orgResponse?.organization) {
              setOrganization({
                name: orgResponse.organization.name,
                logoUrl: orgResponse.organization.logoUrl,
              });
            }
          } catch (orgErr) {
            console.warn("Could not fetch organization details:", orgErr);
          }
        } else {
          setError(
            "You don't have an accepted assignment for this model. Please accept the invitation first.",
          );
        }
      } catch (err: any) {
        console.error("Error checking assignment:", err);
        setError(err?.message || "Failed to verify assignment");
      } finally {
        setLoading(false);
      }
    };

    checkAssignment();
  }, [isAuthenticated, isSessionLoading, modelId, versionId, request]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Spinner />
        <Text variant="bodySm" className="text-gray-600">
          Verifying your assignment...
        </Text>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="mb-6">
          <Link
            href={`/${locale}/dashboard/auditor`}
            className="inline-flex items-center text-purple-600 hover:text-purple-800"
          >
            <IconArrowLeft size={18} className="mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
          <Text variant="bodyMd" className="text-red-600 mb-4">
            {error}
          </Text>
          <div className="flex gap-4">
            <Button
              kind="primary"
              onClick={() => router.push(`/${locale}/dashboard/auditor`)}
            >
              View My Assignments
            </Button>
            {modelId && (
              <Button
                kind="secondary"
                onClick={() =>
                  router.push(`/${locale}/dashboard/auditor/models/${modelId}`)
                }
              >
                View Model Details
              </Button>
            )}
          </div>
        </div>
      </>
    );
  }

  if (validAssignment) {
    // Render the evaluation form inline with organization context
    return (
      <OrganizationContext.Provider value={{ organization, isLoading: false }}>
        <NewEvaluationContent
          orgId={validAssignment.organizationId}
          fromAuditor={true}
        />
      </OrganizationContext.Provider>
    );
  }

  return null;
};

export default AuditorNewEvaluationPage;
