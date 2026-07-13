'use client';

import { Text } from 'opub-ui';
import type { ResourceItem } from '../types';

type ResourceCardProps = {
  resource: ResourceItem;
  onSelect?: (resource: ResourceItem) => void;
};

const ResourceCard = ({ resource, onSelect }: ResourceCardProps) => {
  const isInteractive = Boolean(resource.href || onSelect);

  const handleClick = () => {
    if (resource.href) {
      const isExternal =
        resource.href.startsWith('http://') || resource.href.startsWith('https://');

      if (isExternal) {
        window.open(resource.href, '_blank', 'noopener,noreferrer');
        return;
      }

      window.location.assign(resource.href);
      return;
    }

    onSelect?.(resource);
  };

  return (
    <div
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={`border flex h-auto flex-col overflow-hidden rounded-4 border-solid border-borderDefault bg-basePureWhite p-5 shadow-basicMd transition-all duration-300 ease-in-out ${
        isInteractive ? 'cursor-pointer hover:shadow-basicLg' : ''
      }`}
    >
      <Text color="default" variant="headingMd" className="mb-2">
        {resource.title}
      </Text>
      <Text variant="bodyMd" as="p" color="subdued" className="text-textMedium">
        {resource.description}
      </Text>
    </div>
  );
};

export default ResourceCard;
