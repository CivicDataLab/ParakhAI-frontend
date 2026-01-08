'use client';

import Image from 'next/image';
import { Text } from 'opub-ui';

const features = [
  {
    image: '/images/home/Automated eval.png',
    title: 'Automation-assisted Eval Environment',
    subtitle: 'A guided environment for testing AI models at scale',
    points: [
      'Combines automation with human oversight',
      'Surfaces risks like bias, hallucination, and privacy issues',
      'Enables consistent and repeatable evaluations',
    ],
  },
  {
    image: '/images/home/Expert eval.png',
    title: 'Expert-led Evaluations',
    subtitle: 'Evaluations designed and reviewed by domain experts',
    points: [
      'Focuses on real-world context and nuanced risks',
      'Goes beyond automated signals and metrics',
      'Brings human judgment into AI governance',
    ],
  },
  {
    image: '/images/home/test cases.png',
    title: 'Sector-specific, High Quality Test Cases',
    subtitle: 'Curated test cases tailored to specific sectors',
    points: [
      'Reflects real use cases and deployment contexts',
      'Captures edge cases generic benchmarks miss',
      'Improves relevance and depth of evaluations',
    ],
  },
  {
    image: '/images/home/eval history and reports.png',
    title: 'Evaluation History & Reports',
    subtitle: 'A complete record of evaluations over time',
    points: [
      'Enables safety comparison across versions',
      'Supports AI transparency',
      'Generates clear reports for governance needs',
    ],
  },
];

const HowItWorksSection = () => {
  return (
    <section className="bg-white py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        {/* Section Title */}
        <div className="mb-10 lg:mb-14">
          <Text variant="headingXl" className="text-gray-900">
            How ParakhAI works
          </Text>
        </div>

        {/* Features List */}
        <div className="flex flex-col gap-16 lg:gap-20">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-row gap-12 lg:gap-16 items-center"
            >

              <div className="flex flex-col gap-4 flex-1">
                <Text
                  variant="headingXl"
                  fontWeight="bold"
                  className="text-gray-900"
                >
                  {feature.title}
                </Text>
                <Text variant="bodyLg" className="text-gray-600">
                  {feature.subtitle}
                </Text>
                <ul className="mt-2 space-y-3">
                  {feature.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="flex items-start gap-2">
                      <span className="text-[#6849EE] mt-1">•</span>
                      <Text variant="bodyLg" className="text-gray-700">
                        {point}
                      </Text>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-shrink-0 w-[33vw] max-w-[612px] min-w-[400px] h-[320px] lg:h-[440px] relative rounded-xl overflow-hidden bg-white">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
