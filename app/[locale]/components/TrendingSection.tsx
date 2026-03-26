"use client";

import { Text } from "opub-ui";

const TrendingSection = () => {
  return (
    <section className="w-full bg-[#F5F2FF] bg-[url('/images/home/trending-section-1.svg')] bg-cover bg-center">
      <div className="flex items-center justify-center px-4 md:px-8 py-12 md:py-16 lg:py-20">
        <Text
          as="h2"
          variant="headingXl"
          fontWeight="regular"
          className="text-center text-gray-900 tracking-normal text-[18px] sm:text-[24px] md:text-[30px] lg:text-[36px] xl:text-[40px] leading-normal lg:leading-relaxed"
        >
          <span className="block">
            Improving AI across English, हिन्दी, ଓଡ଼ିଆ,
          </span>
          <span className="block mt-3 sm:mt-4 md:mt-5 lg:mt-6">
            অসমীয়া and more
          </span>
        </Text>
      </div>
    </section>
  );
};

export default TrendingSection;

