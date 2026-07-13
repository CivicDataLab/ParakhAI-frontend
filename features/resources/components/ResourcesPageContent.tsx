'use client';

import { Text } from 'opub-ui';
import { RESOURCE_ITEMS } from '../constants';
import ResourcesGrid from './ResourcesGrid';

const ResourcesPageContent = () => {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8 md:py-14 lg:px-12 lg:py-16">
      <div className="mb-8 md:mb-10 lg:mb-12">
        <Text variant="heading2xl" fontWeight="semibold" className="text-gray-900 mb-3" as="h1">
          Resources
        </Text>
        <Text variant="bodyLg" className="text-gray-600 max-w-3xl">
          Explore methodology documents, guides, and reference materials to help you evaluate AI
          models responsibly with ParakhAI.
        </Text>
      </div>

      <ResourcesGrid resources={RESOURCE_ITEMS} />
    </div>
  );
};

export default ResourcesPageContent;
