'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const features = [
  {
    image: '/images/home/Automated eval.png',
    title: 'Automation-assisted Eval Environment',
    subtitle: 'Scalable, Guided Testing',
  },
  {
    image: '/images/home/Expert eval.png',
    title: 'Expert-led Evaluations',
    subtitle: 'Human Insight, Applied',
  },
  {
    image: '/images/home/test cases.png',
    title: 'Sector-specific, High Quality Test Cases',
    subtitle: 'Built for Domain Relevance',
  },
  {
    image: '/images/home/eval history and reports.png',
    title: 'Evaluation History & Reports',
    subtitle: 'Transparent Timeline of Results & Insights',
  },
];

const FeatureCard = ({ feature, index, isExpanded, cardRef, onToggle }: any) => {
  return (
    <div ref={cardRef} className="mb-4">
      <motion.div
        className={`rounded-2xl overflow-hidden border transition-colors duration-300 cursor-pointer ${
          isExpanded
            ? 'bg-purple-50 border-purple-200 shadow-lg'
            : 'bg-white border-gray-200'
        }`}
        onClick={onToggle}
      >
        {/* Header - Always Visible */}
        <div className="p-6">
          <h3
            className={`text-xl font-bold transition-colors duration-300 ${
              isExpanded ? 'text-gray-900' : 'text-gray-700'
            }`}
          >
            {feature.title}
          </h3>
          <p
            className={`text-sm mt-1 transition-colors duration-300 ${
              isExpanded ? 'text-purple-600' : 'text-gray-500'
            }`}
          >
            {feature.subtitle}
          </p>
        </div>

        {/* Collapsible Image Section */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6">
                <div className="relative w-full rounded-xl overflow-hidden bg-white shadow-sm" style={{ aspectRatio: '16/10' }}>
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const HowItWorksSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef([]);
  const containerRef = useRef(null);
  const sectionRef = useRef(null);
  const lastScrollY = useRef(0);
  const isTransitioning = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (isTransitioning.current) return;

      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY.current;
      lastScrollY.current = currentScrollY;

      const triggerPoint = window.innerHeight * 0.3;
      
      if (isScrollingDown) {
        const activeCard = cardRefs.current[activeIndex];
        if (activeCard) {
          const rect = activeCard.getBoundingClientRect();
          
          if (rect.top < triggerPoint - 100 && activeIndex < features.length - 1) {
            isTransitioning.current = true;
            setActiveIndex(activeIndex + 1);
            
            setTimeout(() => {
              isTransitioning.current = false;
            }, 500);
          }
        }
      } else {
        if (activeIndex > 0) {
          const currentCard = cardRefs.current[activeIndex];
          if (currentCard) {
            const rect = currentCard.getBoundingClientRect();
            
            if (rect.top > triggerPoint + 50) {
              isTransitioning.current = true;
              setActiveIndex(activeIndex - 1);
              
              setTimeout(() => {
                isTransitioning.current = false;
              }, 500);
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeIndex]);

  return (
    <div ref={sectionRef} className="bg-white py-20 min-h-screen">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <div className="lg:w-[35%] lg:sticky lg:top-32 lg:self-start lg:h-fit">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ParakhAI helps you catch biases early.
            </h2>
            <p className="text-lg text-gray-600">
              Test your AI during development and early deployment to identify
              biases and risks, so that your users get trustworthy AI.
            </p>
          </div>

          <div ref={containerRef} className="lg:w-[65%] flex flex-col">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                feature={feature}
                index={index}
                isExpanded={activeIndex === index}
                cardRef={(el) => (cardRefs.current[index] = el)}
                onToggle={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksSection;