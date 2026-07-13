export type ResourceCategory = 'Documentation' | 'Guide' | 'Framework' | 'Reference';

export type ResourceItem = {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  tags?: string[];
  /** External URL or internal app path. Omit for display-only cards. */
  href?: string;
  updatedAt?: string;
};
