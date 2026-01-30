'use client';

import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button, Text } from 'opub-ui';

const steps = [
  {
    icon: '/images/home/login.png',
    title: 'Sign up on ParakhAI',
    description:
      'Create your account to access tools, libraries, and workflows designed to help you evaluate your AI and improve how it behaves.',
  },
  {
    icon: '/images/home/file-text-ai.png',
    title: 'Add your AI Model',
    description:
      'Connect your AI model by providing basic details and endpoints, so it can be tested safely both by developers and automated experts.',
  },
  {
    icon: '/images/home/test-pipe.png',
    title: 'Start testing',
    description:
      'Run guided tests to identify biases and risks or hire expert evaluators, to get clear insights that help you improve your model responsibly.',
  },
];

const GetStartedSection = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const handleGetStarted = () => {
    if (session) {
      router.push('/dashboard');
    } else {
      // After Keycloak login, always land on the dashboard instead of coming back to home
      signIn('keycloak', { callbackUrl: '/dashboard' });
    }
  };

  return (
    <section className="bg-[#F5F3FA] py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        {/* Section Title */}
        <div className="mb-10 lg:mb-14">
          <Text variant="headingXl" className="text-gray-900">
            Catch biases early. Start building trustworthy AI.
          </Text>
        </div>

        {/* Steps - 3 Cards Horizontal */}
        <div className="grid grid-cols-3 gap-6 lg:gap-8 mb-10">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col gap-3 items-start">
              {/* Icon */}
              <div className="w-32 h-32 rounded-lg flex items-start ">
                <Image
                  src={step.icon}
                  alt={step.title}
                  width={128}
                  height={128}
                  className="object-contain"
                />
              </div>

              {/* Step Content */}
              <div className="flex flex-col gap-2">
                <Text variant="headingLg" fontWeight="semibold" className="text-gray-900">
                  {step.title}
                </Text>
                <Text variant="bodyMd" className="text-gray-600 leading-relaxed text-md">
                  {step.description}
                </Text>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        
        <div className="flex justify-center">
          <Button onClick={handleGetStarted} kind="primary" className="bg-[#6849EE] hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold text-base">Get Started →</Button>
        </div>
      </div>
    </section>
  );
};

export default GetStartedSection;
