"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const features = [
  {
    image: "/images/home/Automated eval.png",
    title: "Automation-assisted Eval Environment",
    subtitle: "Scalable, Guided Testing",
    description:
      "Run scalable, guided evaluations in one workspace to consistently understand and compare AI behavior.",
  },
  {
    image: "/images/home/Expert eval.png",
    title: "Expert-led Evaluations",
    subtitle: "Human Insight, Applied",
    description:
      "Apply human expertise to assess real-world AI risks with context-aware judgment and oversight.",
  },
  {
    image: "/images/home/test cases.png",
    title: "Sector-specific, High Quality Test Cases",
    subtitle: "Built for Domain Relevance",
    description:
      "Test your AI models using domain-relevant test cases that reflect real-world usage and edge cases.",
  },
  {
    image: "/images/home/eval history and reports.png",
    title: "Evaluation History & Reports",
    subtitle: "Transparent Timeline of Results & Insights",
    description:
      "Track evaluation results over time to support transparency, comparison, and informed decision-making.",
  },
];

const TAB_TITLES = [
  "Automation-assisted Environment",
  "Expert-led Evaluations",
  "Sector-specific Test Cases",
  "Evaluation History & Reports",
];

interface TabPanelProps {
  feature: (typeof features)[0];
}

const TabPanel = ({ feature }: TabPanelProps) => {
  return (
    <div className="flex flex-row gap-4 items-center flex-wrap">
      <div className="p-5 md:p-6 w-full md:w-1/2">
        <h1
          className="text-base md:text-lg font-bold text-gray-900 text-[20px]
"
        >
          {feature.description}
        </h1>
        {/* <p className="text-sm mt-1 text-[#6849EE]">{feature.subtitle}</p> */}
      </div>
      <div className="md:px-6 pb-6">
        <div className="relative w-full rounded-xl overflow-hidden shadow-sm">
          <img
            src={feature.image}
            alt={feature.title}
            width={600}
            height={400}
            className=" object-contain rounded"
          />
        </div>
      </div>
    </div>
  );
};

const HowItWorksSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFeature = features[activeIndex];

  return (
    <section className="bg-white py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-col gap-2 justify-between">
          <div className="w-full ">
            <h2
              className="text-red-900 mb-6 text-2xl md:text-3xl lg:text-4xl font-regular"
              style={{
                fontSize: "clamp(1.5rem, 3vw, 3.5rem)",
                lineHeight: 1.1,
              }}
            >
              ParakhAI helps you catch biases early.
            </h2>
          </div>

          <div className=" flex flex-col w-full   ">
            {/* Tab buttons */}
            <div className="flex justify-center flex-wrap gap-2 mb-6 gap-5 lg:gap-10">
              {TAB_TITLES.map((title, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`px-3 py-2 border-baseGraySlateAlpha4 rounded-4 text-sm font-medium transition-colors duration-200 ${
                    activeIndex === index
                      ? "bg-[#E8E4FF] text-[#6849EE]"
                      : "text-gray-900 bg-baseGraySlateAlpha1 hover:bg-baseGraySlateAlpha4"
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>

            {/* Only the active tab's content is rendered */}
            <TabPanel feature={activeFeature} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
