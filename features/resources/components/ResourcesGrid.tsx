'use client';

import type { ResourceItem } from '../types';
import ResourceCard from './ResourceCard';

type ResourcesGridProps = {
  resources: ResourceItem[];
  onResourceSelect?: (resource: ResourceItem) => void;
};

const ResourcesGrid = ({ resources, onResourceSelect }: ResourcesGridProps) => {
  if (resources.length === 0) {
    return (
      <p className="text-gray-600 py-12 text-center">
        No resources are available yet. Check back soon.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} onSelect={onResourceSelect} />
      ))}
    </div>
  );
};

export default ResourcesGrid;
