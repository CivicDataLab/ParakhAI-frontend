"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon, Text } from "opub-ui";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import styles from "./styles.module.scss";

const MainFooter = () => {
  const socialMedia = [
    {
      icon: Icons.github,
      link: "https://github.com/civicdatalab",
    },
    {
      icon: Icons.linkedin,
      link: "https://www.linkedin.com/company/civicdatalab",
    },
    {
      icon: Icons.twitter,
      link: "https://twitter.com/civicdatalab",
    },
    {
      icon: Icons.facebook,
      link: "https://facebook.com/civicdatalab",
    },
  ];

  return (
    <div className="bg-primaryPurple2 w-full">
      <div className="footer-container w-full px-3 sm:px-4 lg:px-8 h-[88px]">
        <div className="footer-inner flex items-center justify-center h-full">
          {/* Left: Footer Links */}
          {/* <div className="footer-links flex items-center gap-6">
            <Link
              href={"/sitemap"}
              className="hover:opacity-80 transition-opacity text-white text-[14px] leading-5 font-normal"
            >
              SITEMAP
            </Link>
            <Link
              href={"mailto:info@civicdatalab.in"}
              className="hover:opacity-80 transition-opacity text-white text-[14px] leading-5 font-normal"
            >
              CONTACT US
            </Link>
            <Link
              href={"/about-us"}
              className="hover:opacity-80 transition-opacity text-white text-[14px] leading-5 font-normal"
            >
              ABOUT US
            </Link>
            <Link
              href={"/terms-privacy"}
              className="hover:opacity-80 transition-opacity text-white text-[14px] leading-5 font-normal"
            >
              TERMS & PRIVACY
            </Link>
          </div> */}

          {/* Right: Made by CivicDataLab and Social Media Icons */}
          <div className="footer-center flex items-center gap-1">
            <div className="logo-wrapper inline-flex items-center">
              <Text className="text-white text-[14px] leading-5 font-normal mr-2">
                made by
              </Text>
              <Link
                href={"https://www.civicdatalab.in"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:opacity-90 transition-opacity"
                aria-label="CivicDataLab website"
              >
                <Image
                  src="/images/logos/Full color.png"
                  alt="CivicDataLab logo"
                  width={94}
                  height={32}
                  className="w-[42px] h-[42px]"
                />
              </Link>
            </div>

            {/* Social Media Icons */}
            <div className="footer-social flex items-center gap-[10px] ml-6">
              {socialMedia.map((item, index) => (
                <Link
                  key={index}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 p-2 rounded-[20px] flex items-center justify-center hover:opacity-80 transition-opacity bg-secondaryGreen"
                >
                  <Icon className="text-black" source={item.icon} size={20} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainFooter;
