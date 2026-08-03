"use client";

import { useGraphQL } from "@/lib/graphql-client";
import { isDeprecatedLifecycle } from "@/utils/lifecycle";
import { useParams, useRouter } from "next/navigation";
import { Button, Dialog, Label, Select, Spinner, Text, TextField } from "opub-ui";
import { useEffect, useState } from "react";
import type { AuditType, SelectOption } from "./types";

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
      domain
      isPublic
      versions {
        id
        version
        isLatest
        status
        lifecycleStage
      }
    }
  }
`;

const AUDIT_DOMAIN_OPTIONS_QUERY = `
  query AuditDomainOptions($domain: String!) {
    auditDomainOptions(domain: $domain) {
      domains
    }
  }
`;

const CREATE_BLANK_AUDIT_MUTATION = `
  mutation CreateBlankAudit($input: CreateBlankAuditInput!) {
    createBlankAudit(input: $input) {
      success
      message
      audit {
        id
      }
    }
  }
`;

const UPDATE_AUDIT_MUTATION = `
  mutation UpdateAudit($input: UpdateAuditInput!) {
    updateAudit(input: $input) {
      success
      message
    }
  }
`;

type AIModel = {
  id: string;
  name: string;
  displayName: string;
  modelType: string;
  domain?: string | string[] | null;
  isPublic: boolean;
  versions?: Array<{
    id: number;
    version: string;
    isLatest: boolean;
    status: string;
    lifecycleStage?: string | null;
  }>;
};

type EvaluationMethod = "bulk" | "manual";
type ModalStep = 1 | 2;

const generateDefaultEvaluationName = () => {
  const now = new Date();

  const day = now.getDate();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();

  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const timeString = `${hours}:${minutes}${ampm}`;

  return `Untitled Evaluation - ${day} ${month} ${year} - ${timeString}`;
};

const filterModelsWithActiveVersions = (models: AIModel[]): AIModel[] =>
  models
    .map((model) => ({
      ...model,
      versions: (model.versions || []).filter(
        (v) => !isDeprecatedLifecycle(v.lifecycleStage),
      ),
    }))
    .filter((model) => (model.versions?.length ?? 0) > 0);

const pickDefaultVersionId = (versions?: AIModel["versions"]) => {
  if (!versions?.length) return null;
  const latest = versions.find((v) => v.isLatest);
  return (latest ?? versions[0]).id;
};

const resolveVersionId = (
  versions?: AIModel["versions"],
  preferredId?: string | number | null,
) => {
  if (!versions?.length) return null;
  if (preferredId != null) {
    const match = versions.find((v) => String(v.id) === String(preferredId));
    if (match) return match.id;
  }
  return pickDefaultVersionId(versions);
};

const parseDomainOptions = (domains: unknown[]): SelectOption[] => {
  const options: SelectOption[] = [];

  domains.filter(Boolean).forEach((domainEntry) => {
    let value: string;
    let label: string;

    if (typeof domainEntry === "string") {
      value = domainEntry;
      label = domainEntry;
    } else if (typeof domainEntry === "object" && domainEntry !== null) {
      const entries = Object.entries(domainEntry as Record<string, unknown>);
      if (entries.length > 0) {
        const [backendValue, backendLabel] = entries[0];
        const resolvedLabel =
          backendLabel !== undefined && backendLabel !== null
            ? String(backendLabel)
            : String(backendValue);

        value = String(backendValue);
        label = resolvedLabel;
      } else {
        const fallback = JSON.stringify(domainEntry);
        value = fallback;
        label = fallback;
      }
    } else {
      const fallback = String(domainEntry);
      value = fallback;
      label = fallback;
    }

    if (!options.some((opt) => opt.value === value)) {
      options.push({ value, label });
    }
  });

  return options;
};

interface ModelSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  preselectedModelId?: string;
  preselectedVersionId?: string | number;
  preselectedModel?: AIModel | null;
  lockModelSelection?: boolean;
  variant?: "ai-maker" | "auditor";
}

const ModelSelectionModal = ({
  open,
  onOpenChange,
  orgId,
  preselectedModelId,
  preselectedVersionId,
  preselectedModel,
  lockModelSelection = false,
  variant = "ai-maker",
}: ModelSelectionModalProps) => {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";

  const {
    request,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useGraphQL();

  const [step, setStep] = useState<ModalStep>(1);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(
    null,
  );
  const [evaluationName, setEvaluationName] = useState(
    generateDefaultEvaluationName,
  );
  const [evaluationMethod, setEvaluationMethod] =
    useState<EvaluationMethod>("bulk");
  const [auditType, setAuditType] = useState<AuditType>("Technical");
  const [evaluationDomain, setEvaluationDomain] = useState("");
  const [evaluationDomainOptions, setEvaluationDomainOptions] = useState<
    SelectOption[]
  >([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [auditObjective, setAuditObjective] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedModel = aiModels.find((m) => m.id === selectedModelId);

  const resetFormState = () => {
    setStep(1);
    setEvaluationName(generateDefaultEvaluationName());
    setEvaluationMethod("bulk");
    setAuditType("Technical");
    setEvaluationDomain("");
    setEvaluationDomainOptions([]);
    setAuditObjective("");
    setCreationError(null);
  };

  useEffect(() => {
    if (!open) return;
    resetFormState();
  }, [open]);

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
          { organization: orgId },
        );

        const models = filterModelsWithActiveVersions(data?.aiModels || []);
        let nextModels = models;

        if (
          lockModelSelection &&
          preselectedModel &&
          !models.some((model) => model.id === preselectedModel.id)
        ) {
          const [lockedModel] = filterModelsWithActiveVersions([preselectedModel]);
          if (lockedModel) {
            nextModels = [lockedModel, ...models];
          }
        }

        setAiModels(nextModels);

        if (nextModels.length > 0) {
          if (lockModelSelection && preselectedModelId) {
            const initialModelId = nextModels.some(
              (model) => model.id === preselectedModelId,
            )
              ? preselectedModelId
              : nextModels[0].id;
            const initialModel = nextModels.find(
              (model) => model.id === initialModelId,
            );

            setSelectedModelId(initialModelId);
            setSelectedVersionId(
              resolveVersionId(initialModel?.versions, preselectedVersionId),
            );
          } else {
            setSelectedModelId(nextModels[0].id);
            setSelectedVersionId(pickDefaultVersionId(nextModels[0].versions));
          }
        }
      } catch (error: any) {
        const errorMessage =
          error?.message ||
          error?.response?.errors?.[0]?.message ||
          "Unknown error";
        setModelsError(
          `Failed to load AI models: ${errorMessage}. Please check your authentication and backend configuration.`,
        );
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [
    open,
    isAuthenticated,
    isSessionLoading,
    orgId,
    request,
    preselectedModelId,
    preselectedVersionId,
    preselectedModel,
    lockModelSelection,
  ]);

  useEffect(() => {
    if (!selectedModel?.versions?.length || lockModelSelection) return;
    setSelectedVersionId(pickDefaultVersionId(selectedModel.versions));
  }, [selectedModel, lockModelSelection]);

  useEffect(() => {
    if (!open) {
      const timeoutId = setTimeout(() => {
        setSelectedModelId(null);
        setSelectedVersionId(null);
        setModelsError(null);
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  useEffect(() => {
    if (!selectedModelId || !open || !isAuthenticated || isSessionLoading) {
      return;
    }

    const fetchDomainOptions = async () => {
      try {
        setIsLoadingDomains(true);

        // domain is already available from AI_MODELS_QUERY — no extra fetch needed
        const rawDomain = selectedModel?.domain;
        const domainInput = Array.isArray(rawDomain)
          ? rawDomain.find(Boolean) || ""
          : rawDomain || "";

        if (!domainInput) {
          setEvaluationDomainOptions([]);
          setEvaluationDomain("");
          return;
        }

        const domainOptionsResult = await request<{
          auditDomainOptions: { domains?: unknown[] | null } | null;
        }>(
          AUDIT_DOMAIN_OPTIONS_QUERY,
          { domain: domainInput },
          { organization: orgId },
        );

        const options = parseDomainOptions(
          domainOptionsResult?.auditDomainOptions?.domains || [],
        );
        setEvaluationDomainOptions(options);
        setEvaluationDomain((current) =>
          options.some((opt) => opt.value === current)
            ? current
            : (options[0]?.value ?? ""),
        );
      } catch {
        setEvaluationDomainOptions([]);
        setEvaluationDomain("");
      } finally {
        setIsLoadingDomains(false);
      }
    };

    void fetchDomainOptions();
  }, [selectedModelId, selectedModel, open, isAuthenticated, isSessionLoading, orgId, request]);

  const canProceedStep1 =
    selectedModelId &&
    selectedVersionId &&
    evaluationName.trim() &&
    !isLoadingModels;

  const requiresEvaluationDomain = evaluationDomainOptions.length > 0;
  const canProceedStep2 =
    auditObjective.trim() &&
    (!requiresEvaluationDomain || evaluationDomain.trim()) &&
    !isLoadingDomains;

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    onOpenChange(false);
  };

  const handlePrimaryAction = () => {
    if (step === 1) {
      if (!canProceedStep1) return;
      setStep(2);
      return;
    }

    if (!canProceedStep2 || !selectedModelId || !selectedVersionId) return;

    setIsSubmitting(true);
    setCreationError(null);

    const createAndRedirect = async () => {
      try {
        const createResult = await request<{
          createBlankAudit: { success: boolean; message: string; audit: { id: string } };
        }>(
          CREATE_BLANK_AUDIT_MUTATION,
          { input: { modelId: selectedModelId, modelVersionId: selectedVersionId, name: evaluationName.trim() } },
          { organization: orgId },
        );

        if (!createResult?.createBlankAudit?.success || !createResult.createBlankAudit.audit?.id) {
          throw new Error(createResult?.createBlankAudit?.message || "Failed to create evaluation.");
        }

        const auditId = String(createResult.createBlankAudit.audit.id);

        await request(
          UPDATE_AUDIT_MUTATION,
          {
            input: {
              auditId,
              name: evaluationName.trim(),
              auditType,
              evaluationMode: evaluationMethod === "bulk" ? "BULK" : "PLAYGROUND",
              auditScope: evaluationDomain.trim() || null,
              auditObjective: auditObjective.trim(),
              configuration: {
                auditType,
                auditObjective: auditObjective.trim(),
                auditScope: evaluationDomain.trim() || null,
                evaluationMode: evaluationMethod === "bulk" ? "BULK" : "PLAYGROUND",
              },
            },
          },
          { organization: orgId },
        );

        router.push(
          variant === "auditor"
            ? `/${locale}/dashboard/auditor/evaluations/new?modelId=${selectedModelId}&versionId=${selectedVersionId}&auditId=${auditId}`
            : `/${locale}/dashboard/ai-maker/${orgId}/evaluations/new?auditId=${auditId}`,
        );
        onOpenChange(false);
      } catch (err: any) {
        setCreationError(err?.message || "Failed to start evaluation. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    };

    void createAndRedirect();
  };

  const isPrimaryDisabled =
    step === 1 ? !canProceedStep1 : !canProceedStep2 || isSubmitting;

  const primaryButtonClassName = isPrimaryDisabled
    ? "!rounded-[8px] !cursor-not-allowed !border-none !bg-[#8c949d] !text-white hover:!bg-[#8c949d]"
    : "!rounded-[8px] !border-none !bg-primaryPurple2 !text-white hover:!bg-[#6849EE] hover:!text-white";

  const primaryLabel =
    step === 1 ? "Next" : isSubmitting ? "Starting..." : "Start Evaluation";

  const evaluatorOptions: Array<{
    value: AuditType;
    id: string;
    title: string;
    description: string;
  }> = [
    {
      value: "Technical",
      id: "evaluator-technical",
      title: "a technical evaluator",
      description:
        "I can check performance, safety, and misinformation",
    },
    {
      value: "Domain",
      id: "evaluator-domain",
      title: "a domain expert",
      description:
        "I can evaluate accuracy and biases using domain knowledge",
    },
    {
      value: "Cultural",
      id: "evaluator-cultural",
      title: "a cultural expert",
      description:
        "I can evaluate biases based on cultural nuances",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}  >
      <Dialog.Content
        title="Start an Evaluation"
        data-start-evaluation-step={step === 2 ? "2" : undefined}
        className={"start-evaluation-modal-content max-h-[calc(100vh-50vh)] overflow-y-scroll"}
        footer={
          <div className="start-evaluation-modal-footer flex w-full !w-[100%] items-center justify-center gap-4">
            <Button
              kind="secondary"
              onClick={handleBack}
              disabled={step === 1}
              className="!flex-1 !rounded-[8px] !justify-center disabled:!cursor-not-allowed disabled:!opacity-50"
            >
              Back
            </Button>
            <Button
              kind="primary"
              onClick={handlePrimaryAction}
              disabled={isPrimaryDisabled}
              className={`!flex-1 !rounded-[8px] !justify-center ${primaryButtonClassName}`}
            >
              {primaryLabel}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6 py-2">
          {creationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text variant="bodySm" className="text-red-700">
                {creationError}
              </Text>
            </div>
          )}
          {step === 1 ? (
            <>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      name="modelSelect"
                      label="Select an AI Model"
                      requiredIndicator
                      disabled={lockModelSelection}
                      className={
                        lockModelSelection
                          ? "mode-of-evaluation-select-disabled"
                          : undefined
                      }
                      options={aiModels.map((model) => ({
                        value: model.id,
                        label: model.displayName || model.name,
                      }))}
                      value={selectedModelId || ""}
                      onChange={(value) => {
                        setSelectedModelId(value);
                        const model = aiModels.find((m) => m.id === value);
                        setSelectedVersionId(
                          pickDefaultVersionId(model?.versions),
                        );
                      }}
                    />
                    {selectedModel?.versions?.length ? (
                      <Select
                        name="versionSelect"
                        label="Select a Version"
                        requiredIndicator
                        disabled={lockModelSelection}
                        className={
                          lockModelSelection
                            ? "mode-of-evaluation-select-disabled"
                            : undefined
                        }
                        options={selectedModel.versions.map((ver) => ({
                          value: String(ver.id),
                          label: `Version ${ver.version}`,
                        }))}
                        value={
                          selectedVersionId ? String(selectedVersionId) : ""
                        }
                        onChange={(value) =>
                          setSelectedVersionId(value ? Number(value) : null)
                        }
                      />
                    ) : (
                      <div />
                    )}
                  </div>

                  <TextField
                    name="evaluationName"
                    label="Evaluation Name"
                    requiredIndicator
                    value={evaluationName}
                    onChange={(value) => setEvaluationName(value)}
                    helpText="You can rename your evaluation at any point later as well"
                  />

                  <div className="space-y-3">
                    <Label htmlFor="evaluationMethod-bulk">
                      <Text variant="bodyMd" fontWeight="medium">
                        Evaluation Method
                        <span className="required-asterisk" aria-hidden="true">
                          *
                        </span>
                      </Text>
                    </Label>

                    <div className="space-y-4">
                      <label
                        htmlFor="evaluationMethod-bulk"
                        className="flex items-start gap-3 cursor-pointer"
                      >
                        <input
                          id="evaluationMethod-bulk"
                          type="radio"
                          name="evaluationMethod"
                          value="bulk"
                          checked={evaluationMethod === "bulk"}
                          onChange={() => setEvaluationMethod("bulk")}
                          className="mt-1 h-4 w-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
                        />
                        <div className="flex-1">
                          <Text
                            variant="bodyMd"
                            fontWeight="semibold"
                            className="text-gray-900"
                          >
                            Bulk Evaluation
                          </Text>
                          <Text variant="bodySm" className="text-gray-600 block">
                            Use prompt datasets &amp; AI assistance to test the
                            model for risks
                          </Text>
                        </div>
                      </label>

                      <label
                        htmlFor="evaluationMethod-playground"
                        className="flex items-start gap-3 cursor-pointer"
                      >
                        <input
                          id="evaluationMethod-playground"
                          type="radio"
                          name="evaluationMethod"
                          value="manual"
                          checked={evaluationMethod === "manual"}
                          onChange={() => setEvaluationMethod("manual")}
                          className="mt-1 h-4 w-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
                        />
                        <div className="flex-1">
                          <Text
                            variant="bodyMd"
                            fontWeight="semibold"
                            className="text-gray-900"
                          >
                            Playground Evaluation
                          </Text>
                          <Text variant="bodySm" className="text-gray-600 block">
                            Add &amp; edit prompts one at a time to test the model
                            for risks
                          </Text>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4">
                  <Text variant="bodySm" className="text-gray-600">
                    No models available. Please check your backend configuration.
                  </Text>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-3">
                <Label htmlFor="evaluator-technical">
                  <Text variant="bodyMd" fontWeight="medium">
                    I am evaluating as
                    <span className="required-asterisk" aria-hidden="true">
                      *
                    </span>
                  </Text>
                </Label>

                <div className="space-y-4">
                  {evaluatorOptions.map((option) => (
                    <label
                      key={option.id}
                      htmlFor={option.id}
                      className="flex items-start gap-3 cursor-pointer"
                    >
                      <input
                        id={option.id}
                        type="radio"
                        name="evaluatorType"
                        value={option.value}
                        checked={auditType === option.value}
                        onChange={() => setAuditType(option.value)}
                        className="mt-1 h-4 w-4 text-primary-purple focus:ring-primary-purple focus:ring-2"
                      />
                      <div className="flex-1">
                        <Text
                          variant="bodyMd"
                          fontWeight="semibold"
                          className="text-gray-900"
                        >
                          {option.title}
                        </Text>
                        <Text variant="bodySm" className="text-gray-600 block">
                          {option.description}
                        </Text>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {requiresEvaluationDomain && (
                <div>
                  {isLoadingDomains ? (
                    <div className="flex items-center gap-3 py-2">
                      <Spinner />
                      <Text variant="bodySm" className="text-gray-600">
                        Loading evaluation domains...
                      </Text>
                    </div>
                  ) : (
                    <Select
                      name="evaluationDomain"
                      label="Evaluation Domain"
                      requiredIndicator
                      options={evaluationDomainOptions}
                      value={evaluationDomain}
                      onChange={setEvaluationDomain}
                      helpText="This field adds relevant AI assistance templates in the next step."
                    />
                  )}
                </div>
              )}

              <TextField
                name="auditObjective"
                label="Evaluation Objective"
                requiredIndicator
                multiline={3}
                value={auditObjective}
                onChange={setAuditObjective}
              />
            </>
          )}
        </div>
      </Dialog.Content>
    </Dialog>
  );
};

export default ModelSelectionModal;
