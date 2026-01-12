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

interface FeatureCardProps {
  feature: (typeof features)[0];
  index: number;
  isExpanded: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
  onToggle: () => void;
}

const FeatureCard = ({ feature, index, isExpanded, cardRef, onToggle }: FeatureCardProps) => {
  return (
    <div ref={cardRef} className="mb-4">
      <motion.div
        className={`rounded-2xl overflow-hidden border transition-colors duration-300 cursor-pointer ${
          isExpanded
            ? 'bg-[#F8F7FF] border-[#E8E4FF] shadow-md'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
        onClick={onToggle}
      >
        {/* Header - Always Visible */}
        <div className="p-5 md:p-6">
          <h3
            className={`text-base md:text-lg font-bold transition-colors duration-300 ${
              isExpanded ? 'text-gray-900' : 'text-gray-800'
            }`}
          >
            {feature.title}
          </h3>
          <p
            className={`text-sm mt-1 transition-all duration-300 ${
              isExpanded 
                ? 'text-[#6849EE] underline underline-offset-2' 
                : 'text-[#6849EE]'
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
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
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
    <section ref={sectionRef} className="bg-white py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <div className="lg:w-[35%] lg:sticky lg:top-32 lg:self-start lg:h-fit">
            <h2 
              className="font-bold text-gray-900 mb-6"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1 }}
            >
              ParakhAI helps you catch biases early.
            </h2>
            <p className="text-base md:text-lg text-gray-600 leading-relaxed">
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
                cardRef={(el: HTMLDivElement | null) => { cardRefs.current[index] = el; }}
                onToggle={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;