"use client";

import { useGraphQL } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Button, Dialog, Select, Spinner, Text } from "opub-ui";
import { useEffect, useState } from "react";

// GraphQL query to fetch AI models with their versions
const AI_MODELS_QUERY = `
  query GetAIModels(
    $status: String
    $modelType: String
    $provider: String
    $isPublic: Boolean
    $limit: Int
    $offset: Int
  ) {
    aiModels(
      status: $status
      modelType: $modelType
      provider: $provider
      isPublic: $isPublic
      limit: $limit
      offset: $offset
    ) {
      id
      name
      displayName
      modelType
      isPublic
      versions {
        id
        version
        isLatest
        status
      }
    }
  }
`;

type AIModel = {
  id: string;
  name: string;
  displayName: string;
  modelType: string;
  isPublic: boolean;
  versions?: Array<{
    id: number;
    version: string;
    isLatest: boolean;
    status: string;
  }>;
};

interface ModelSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

const ModelSelectionModal = ({
  open,
  onOpenChange,
  orgId,
}: ModelSelectionModalProps) => {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";

  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();

  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(
    null
  );
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedModel = aiModels.find((m) => m.id === selectedModelId);
  const latestVersion = selectedModel?.versions?.find((v) => v.isLatest);

  // Fetch AI models when modal opens
  useEffect(() => {
    if (!open || !isAuthenticated || isSessionLoading) return;

    const fetchModels = async () => {
      try {
        setIsLoadingModels(true);
        setModelsError(null);

        const data = await request<{ aiModels: AIModel[] }>(
          AI_MODELS_QUERY,
          {
            status: "ACTIVE",
            modelType: null,
            provider: null,
            isPublic: true,
            limit: 50,
            offset: 0,
          },
          { organization: orgId }
        );

        const models = data?.aiModels || [];
        setAiModels(models);

        // Auto-select first model if available
        if (models.length > 0 && !selectedModelId) {
          setSelectedModelId(models[0].id);
          const firstModel = models[0];
          const latestVer = firstModel.versions?.find((v) => v.isLatest);
          if (latestVer) {
            setSelectedVersionId(latestVer.id);
          }
        }
      } catch (error: any) {
        const errorMessage =
          error?.message ||
          error?.response?.errors?.[0]?.message ||
          "Unknown error";
        setModelsError(
          `Failed to load AI models: ${errorMessage}. Please check your authentication and backend configuration.`
        );
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [open, isAuthenticated, isSessionLoading, orgId, request]);

  // Auto-select latest version when model changes
  useEffect(() => {
    if (selectedModel && selectedModel.versions) {
      const latestVer = selectedModel.versions.find((v) => v.isLatest);
      if (latestVer) {
        setSelectedVersionId(latestVer.id);
      } else if (selectedModel.versions.length > 0) {
        // If no latest version, select first one
        setSelectedVersionId(selectedModel.versions[0].id);
      }
    }
  }, [selectedModel]);

  // Reset state when modal closes with delay to prevent portal cleanup errors
  useEffect(() => {
    if (!open) {
      // Add a small delay to ensure Dialog cleanup completes before state updates
      const timeoutId = setTimeout(() => {
        setSelectedModelId(null);
        setSelectedVersionId(null);
        setModelsError(null);
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  const handleStart = () => {
    if (!selectedModelId || !selectedVersionId) {
      return;
    }

    setIsSubmitting(true);

    // Navigate to new evaluation page with search params
    const searchParams = new URLSearchParams({
      modelId: selectedModelId,
      versionId: String(selectedVersionId),
    });

    router.push(
      `/${locale}/dashboard/ai-maker/${orgId}/evaluations/new?${searchParams.toString()}`
    );

    // Close modal
    onOpenChange(false);
    setIsSubmitting(false);
  };

  const canStart = selectedModelId && selectedVersionId && !isLoadingModels;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content title="Start New Evaluation" footer={<></>}>
        <div className="flex flex-col gap-6 py-4">
          {isLoadingModels ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Spinner />
              <Text variant="bodySm" className="text-gray-600">
                Loading models...
              </Text>
            </div>
          ) : modelsError ? (
            <div className="py-4">
              <Text variant="bodySm" className="text-red-600">
                {modelsError}
              </Text>
            </div>
          ) : aiModels.length > 0 ? (
            <>
              <div>
                <Select
                  name="modelSelect"
                  label="Select AI Model"
                  options={aiModels.map((model) => ({
                    value: model.id,
                    label: model.displayName || model.name,
                  }))}
                  value={selectedModelId || ""}
                  onChange={(value) => {
                    setSelectedModelId(value);
                    const model = aiModels.find((m) => m.id === value);
                    const latestVer = model?.versions?.find((v) => v.isLatest);
                    setSelectedVersionId(latestVer?.id || null);
                  }}
                />
              </div>
              {selectedModel &&
                selectedModel.versions &&
                selectedModel.versions.length > 0 && (
                  <div>
                    <Select
                      name="versionSelect"
                      label="Select Model Version"
                      options={selectedModel.versions.map((ver) => ({
                        value: String(ver.id),
                        label: `${ver.version}${ver.isLatest ? " (Latest)" : ""}`,
                      }))}
                      value={selectedVersionId ? String(selectedVersionId) : ""}
                      onChange={(value) =>
                        setSelectedVersionId(value ? Number(value) : null)
                      }
                    />
                  </div>
                )}
            </>
          ) : (
            <div className="py-4">
              <Text variant="bodySm" className="text-gray-600">
                No models available. Please check your backend configuration.
              </Text>
            </div>
          )}
        </div>
        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button kind="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleStart}
            disabled={!canStart || isSubmitting}
            className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold text-base"
          >
            {isSubmitting ? "Starting..." : "Start"}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog>
  );
};

export default ModelSelectionModal;
