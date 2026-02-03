export type SelectOption = { value: string; label: string };

export type AuditType = 'Technical' | 'Domain' | 'Cultural';

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

