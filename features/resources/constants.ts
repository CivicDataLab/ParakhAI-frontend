import type { ResourceItem } from './types';

export const RESOURCE_ITEMS: ResourceItem[] = [
  {
    id: 'methodology',
    title: 'Evaluation Methodology',
    description:
      'Learn how ParakhAI structures automated and expert-led evaluations, including audit modules, scoring, and reporting workflows.',
    category: 'Documentation',
    tags: ['Methodology', 'Evaluation'],
    href: 'https://github.com/CivicDataLab/ParakhAI-frontend',
    updatedAt: '2025',
  },
  {
    id: 'user-guide',
    title: 'User Guide',
    description:
      'Step-by-step instructions for signing up, registering AI models, running evaluations, and inviting expert auditors.',
    category: 'Guide',
    tags: ['Guide', 'Getting Started'],
    href: 'https://github.com/CivicDataLab/ParakhAI-frontend#getting-started',
    updatedAt: '2025',
  },
  {
    id: 'evaluation-framework',
    title: 'Evaluation Framework',
    description:
      'Overview of technical, domain, and cultural audit dimensions used to assess AI model safety, fairness, and reliability.',
    category: 'Framework',
    tags: ['Framework', 'Audits'],
    updatedAt: '2025',
  },
  {
    id: 'prompt-libraries',
    title: 'Prompt Libraries',
    description:
      'Reference documentation for sector-specific test cases and prompt datasets available within the evaluation workspace.',
    category: 'Reference',
    tags: ['Test Cases', 'Datasets'],
    updatedAt: '2025',
  },
  {
    id: 'glossary',
    title: 'Glossary',
    description:
      'Definitions of key terms used across ParakhAI evaluations, audit results, and expert review workflows.',
    category: 'Reference',
    tags: ['Reference', 'Terminology'],
    updatedAt: '2025',
  },
  {
    id: 'release-notes',
    title: 'Release Notes',
    description:
      'Track platform updates, new evaluation capabilities, and changes to the ParakhAI evaluation environment.',
    category: 'Documentation',
    tags: ['Changelog', 'Updates'],
    href: 'https://github.com/CivicDataLab/ParakhAI-frontend/releases',
    updatedAt: '2025',
  },
];
