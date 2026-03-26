"use client";

import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "opub-ui";

const HeroSection = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const handleGetStarted = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      // After Keycloak login, always land on the dashboard instead of returning to home
      signIn("keycloak", { callbackUrl: "/dashboard" });
    }
  };

  return (
    <section className="relative py-16 md:py-20 lg:py-24 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/home/Hero BG.png"
          alt="Hero Background"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl lg:text-[3.5rem] text-[#5119C1] font-[400] text-gray-900 mb-6 leading-[1]">
            Build AI that's trustworthy 
            <br />
            {/* text-[#6849EE] */}
            <span className=""> from day one.</span>
          </h1>

          <p className="text-base md:text-lg text-gray-700 mb-8 max-w-2xl">
            Identify hidden <strong>risks</strong> in your AI models and build{" "}
            <strong>trust</strong>  through participatory, automated-assisted, and expert-led evaluations with ParakhAI

          </p>

          <Button
            kind="primary"
            onClick={handleGetStarted}
            className="bg-[#26007B] hover:bg-[#6849EE] hover:!bg-[#6849EE] text-white hover:text-white hover:!text-white px-8 py-3 rounded-[8px] font-bold text-base"
          >
            Get Started →
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
