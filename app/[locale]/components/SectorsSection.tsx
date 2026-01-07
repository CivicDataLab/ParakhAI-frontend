'use client';

import { graphqlRequest } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { Divider, Text } from 'opub-ui';

const SECTORS_WITH_AIMODELS_QUERY = `
  query SectorsWithAIModels {
    sectorsWithAimodels(limit: 6) {
      id
      name
      slug
      description
      aimodelCount
    }
  }
`;

interface Sector {
  id: string;
  name: string;
  slug: string;
  description?: string;
  aimodelCount?: number;
}

const SectorsSection = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sectors_with_aimodels'],
    queryFn: async () => {
      // Use unauthenticated request for public homepage
      const result = await graphqlRequest<{ sectorsWithAimodels: Sector[] }>(
        SECTORS_WITH_AIMODELS_QUERY,
        {},
        null // No auth token needed for public query
      );
      return result;
    },
  });

  const sectors = data?.sectorsWithAimodels || [];

  // Fallback static sectors for display when API is loading or no data
  const fallbackSectors = [
    { id: '1', name: 'Budgets', slug: 'budgets', aimodelCount: 388 },
    { id: '2', name: 'Child Rights', slug: 'child-rights', aimodelCount: 388 },
    { id: '3', name: 'Climate Finance', slug: 'climate-finance', aimodelCount: 988 },
    { id: '4', name: 'Disaster Risk Reduction (DRR)', slug: 'disaster-risk-reduction', aimodelCount: 203 },
    { id: '5', name: 'Law and Justice', slug: 'law-and-justice', aimodelCount: 388 },
    { id: '6', name: 'Urban Development', slug: 'urban-development', aimodelCount: 988 },
  ];

  const displaySectors = sectors.length > 0 ? sectors : fallbackSectors;

  return (
    <section className="bg-white py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        <div className="mb-8 lg:mb-12">
          <Text variant="headingXl" className="text-gray-900">
            Improving AI across sectors
          </Text>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="animate-pulse bg-gray-100 rounded-xl h-[100px]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displaySectors.map((sector: any) => (
              <Link
                href={`/models?sector=${sector.slug}`}
                key={sector.id}
                className="group"
              >
                <div className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300">
                  {/* Sector Icon */}
                  <div className="flex-shrink-0">
                    <Image
                      src={`/Sectors/${sector.name}.svg`}
                      width={80}
                      height={80}
                      alt={`${sector.name} icon`}
                    />
                  </div>

                  {/* Sector Info */}
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <Text
                      variant="headingMd"
                      fontWeight="semibold"
                      className="text-gray-900 truncate"
                    >
                      {sector.name}
                    </Text>
                    <Divider className="bg-gray-200" />
                    <div className="flex items-center gap-1">
                      <Text
                        variant="bodyMd"
                        fontWeight="bold"
                        className="text-[#6849EE]"
                      >
                        {sector.aimodelCount || '—'}
                      </Text>
                      <Text variant="bodyMd" className="text-gray-600">
                        AI Models
                      </Text>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SectorsSection;
