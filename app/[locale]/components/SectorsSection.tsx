"use client";

import Link from "next/link";
import Image from "next/image";
import { Text } from "opub-ui";

type DisplaySector = {
  name: string;
  slug: string;
  icon: string;
};

const AllSectors: DisplaySector[] = [
  {
    name: "HEALTHCARE",
    slug: "healthcare",
    icon: "/images/domain/healthcare.svg",
  },
  {
    name: "AGRICULTURE",
    slug: "agriculture",
    icon: "/images/domain/agri.svg",
  },
  {
    name: "CLIMATE",
    slug: "environment",
    icon: "/images/domain/environment.svg",
  },
  {
    name: "EDUCATION",
    slug: "education",
    icon: "/images/domain/education.svg",
  },
  { name: "LEGAL", slug: "legal", icon: "/images/domain/legal.svg" },
  { name: "FINANCE", slug: "finance", icon: "/images/domain/finance.svg" },

  // {
  //   name: "GOVERNMENT",
  //   slug: "government",
  //   icon: "/images/icons/government.png",
  // },
  {
    name: "TECHNOLOGY",
    slug: "technology",
    icon: "/images/domain/technology.svg",
  },
  { name: "SCIENCE", slug: "science", icon: "/images/domain/science.svg" },
  {
    name: "SOCIAL SERVICES",
    slug: "social_services",
    icon: "/images/domain/social services.svg",
  },
  {
    name: "TRANSPORTATION",
    slug: "transportation",
    icon: "/images/domain/transport.svg",
  },
  { name: "ENERGY", slug: "energy", icon: "/images/domain/energy.svg" },
  // { name: "GENERAL", slug: "general", icon: "/images/logos/CDL Logo.png" },
  // { name: "OTHER", slug: "other", icon: "/images/logos/CDL Logo.png" },
];

const SectorsSection = () => {
  const isLoading = false;

  return (
    <section className="bg-[#F5F2FF] py-12 md:py-12 lg:py-17">
      <div className="container mx-auto px-4 md:px-8 lg:px-10">
        <div className="mb-8 lg:mb-10">
          <Text
            variant="headingXl"
            fontWeight="regular"
            className="text-gray-900"
          >
            Improving AI across domains
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
          <div className="flex flex-row gap-6 w-full flex-wrap justify-center   pt-2 ">
            {AllSectors.map((sector) => (
              <Link
                href={`/models?sector=${sector.slug}`}
                key={sector.slug}
                className="group border-1 h-[90px] border-solid md:min-w-[300px] rounded-2 bg-white  transition-all duration-300 flex justify-around items-center"
              >
                <div className="flex items-center w-full gap-4 p-5 justify-between ">
                  {/* Sector Info */}
                  <div className="flex flex-col gap-2 justify-center flex-1 min-w-0">
                    <Text
                      variant="headingMd"
                      fontWeight="semibold"
                      className="text-gray-900 truncate"
                    >
                      {sector.name}
                    </Text>
                    {/* <Divider className="bg-gray-200" /> */}
                    {/* <div className="flex items-center gap-1">
                      <Text
                        variant="bodyMd"
                        fontWeight="bold"
                        className="text-[#6849EE]"
                      >
                        {sector.aimodelCount || "—"}
                      </Text>
                      <Text variant="bodyMd" className="text-gray-600">
                        AI Models
                      </Text>
                    </div> */}
                  </div>
                  {/* Sector Icon */}
                  <div className="flex-shrink-0">
                    <Image
                      src={sector.icon}
                      width={36}
                      height={36}
                      alt={`${sector.name} icon`}
                      className="w-full h-full object-contain"
                    />
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
