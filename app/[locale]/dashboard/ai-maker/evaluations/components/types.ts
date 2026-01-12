export type SelectOption = { value: string; label: string };

export type AuditType = 'technical' | 'domain' | 'cultural';

export type Module = {
  name: string;
  displayName: string;
  description: string;
  metrics: Array<{
    name: string;
    displayName: string;
    description: string;
  }>;
};

