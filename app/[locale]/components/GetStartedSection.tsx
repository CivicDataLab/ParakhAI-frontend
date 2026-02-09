"use client";

import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, Text } from "opub-ui";

const steps = [
  {
    icon: "/images/home/login.png",
    title: "Sign up on ParakhAI",
    description:
      "Create an account to access the open-source evaluation environment, prompt libraries, and workflows for participatory AI assessment.",
  },
  {
    icon: "/images/home/file-text-ai.png",
    title: "Add your AI Model",
    description:
      "Register your AI model with basic details to enable automated-assisted and expert-led evaluations across the AI lifecycle.",
  },
  {
    icon: "/images/home/test-pipe.png",
    title: "Start testing",
    description:
      "Run guided evaluations to identify bias, misinformation, privacy, and safety risks, or invite experts to generate actionable insights for responsible AI deployment.",
  },
];

const GetStartedSection = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const handleGetStarted = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      // After Keycloak login, always land on the dashboard instead of coming back to home
      signIn("keycloak", { callbackUrl: "/dashboard" });
    }
  };

  return (
    <section className="bg-secondaryYellow py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        {/* Section Title */}
        <div className="mb-10 lg:mb-14 text-center">
          <Text
            variant="headingXl"
            fontWeight="regular"
            className="text-gray-900 "
          >
             Start building trustworthy AI today.
          </Text>
        </div>

        {/* Steps - 3 Cards with left arrows between */}
        <div className="flex items-center gap-3 lg:gap-4 mb-10">
          {steps.map((step, index) => (
            <div key={index} className="contents">
              <div className="flex flex-1 min-w-0 bg-white h-[240px] flex-col gap-3 items-center p-4 rounded-2 justify-between">
                {/* Icon */}
                <div className="rounded-lg flex flex-col items-center gap-4 ">
                  <Image
                    src={step.icon}
                    alt={step.title}
                    width={60}
                    height={60}
                    className="object-contain"
                  />
                  {/* Step Content */}
                  <Text
                    variant="headingLg"
                    fontWeight="semibold"
                    className="text-gray-900"
                  >
                    {step.title}
                  </Text>
                </div>

                <Text
                  variant="bodyMd"
                  className="text-gray-600 leading-relaxed text-md"
                >
                  {step.description}
                </Text>
              </div>
              {index < steps.length - 1 && (
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"
                  aria-hidden
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA Button */}

        <div className="flex justify-center">
          <Button
            onClick={handleGetStarted}
            kind="primary"
            className="bg-primaryPurple2 hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold text-base"
          >
            Get Started →
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GetStartedSection;
