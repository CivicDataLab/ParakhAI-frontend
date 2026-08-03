export type SelectOption = { value: string; label: string; mandatoryInputs?: string[] };

export type CustomPromptRow = {
  id: string;
  input: string;
  expectedOutput: string;
  category: string;
  riskType: string;
  selected: boolean;
};

export type AuditType = 'Technical' | 'Domain' | 'Cultural';

export type Module = {
  name: string;
  displayName: string;
  description: string;
  metrics: Array<{
    name: string;
    displayName: string;
    description: string;
    mandatoryInputs?: string[];
  }>;
};

