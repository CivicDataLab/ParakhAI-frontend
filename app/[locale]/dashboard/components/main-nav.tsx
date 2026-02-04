"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Spinner, Icon, IconButton } from "opub-ui";

import { Icons } from "@/components/icons";
import { ProfileMenu } from "@/components/ProfileMenu";
import MobileNav from "./mobile-nav";

const buildNavigationLinks = () => {
  return [
    { label: "Resources", href: "/resources" },
    { label: "Evaluation Workspace", href: "/dashboard" },
  ];
};

const MainNav = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const navigationLinks = React.useMemo(buildNavigationLinks, []);

  return (
    <>
      <nav className="bg-primaryPurple2 sticky top-0 z-[99999] w-full">
        <div className="w-full px-3 sm:px-4 lg:px-8">
          {/* Top bar container */}
          <div className="flex items-center justify-between min-h-[80px] py-4 lg:min-h-[60px] lg:py-3 gap-4">
            {/* LEFT: Logo (MobileNav only visible on mobile) */}
            <div className="flex items-center gap-3">
              {/* Mobile Navigation - only visible on mobile */}
              <div className="lg:hidden">
                <MobileNav
                  navigationLinks={navigationLinks}
                  session={session}
                  status={status}
                />
              </div>

              {/* Logo - always visible */}
              <div className="flex items-center flex-shrink-0">
                <Link
                  href="/"
                  className="flex items-center"
                  aria-label="ParakhAI Home"
                >
                  <div
                    className="relative overflow-hidden 
                                h-6 w-[100px] 
                                md:h-7 md:w-[120px] 
                                lg:h-[55px] lg:w-[165px] lg:p-[6.53px]"
                  >
                    <Image
                      src="/images/logos/parakhai-logo.png"
                      alt="ParakhAI"
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 100px, (max-width: 1024px) 120px, 165px"
                    />
                  </div>
                </Link>
              </div>
            </div>

            {/* RIGHT: Navigation Links + Avatar/Profile (desktop only) */}
            <div className="hidden lg:flex items-center gap-6">
              {/* Navigation Links */}
              {navigationLinks.map((link) => {
                const isExternal =
                  link.href.startsWith("http://") ||
                  link.href.startsWith("https://");
                const normalizedPath = (() => {
                  if (!pathname) return "/";
                  // Strip the leading locale segment if present: "/en/dashboard" -> "/dashboard"
                  const withoutLocale = pathname.replace(/^\/[^/]+(?=\/)/, "");
                  return withoutLocale || "/";
                })();
                const isActive =
                  !isExternal &&
                  (normalizedPath === link.href ||
                    normalizedPath.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className={`inline-flex items-center h-6 py-[2px] px-[5px] rounded hover:opacity-80 transition-opacity whitespace-nowrap ${
                      isActive ? "underline decoration-secondaryGreen" : ""
                    }`}
                  >
                    <span
                      className={`text-base font-semibold leading-6 ${
                        isActive ? "text-secondaryGreen" : "text-white"
                      }`}
                    >
                      {link.label}
                    </span>
                  </Link>
                );
              })}

              {/* Profile/Sign In */}
              <div className="flex items-center gap-3 ml-6">
                {status === "loading" ? (
                  <Spinner />
                ) : session ? (
                  <ProfileMenu
                    user={{
                      name: session.user?.name,
                      email: session.user?.email,
                    }}
                    align="end"
                    side="bottom"
                    sideOffset={4}
                    contentClassName="profile-popover-content bg-white border border-gray-200 shadow-lg rounded-xl z-[10000]"
                  />
                ) : (
                  <button
                    onClick={() => signIn("keycloak")}
                    className="bg-borderHighlightSubdued text-baseVioletSolid12 
                               text-base font-semibold uppercase tracking-[0.08em] 
                               py-3 px-6 rounded-lg border border-transparent 
                               inline-flex items-center justify-center 
                               transition-all duration-150 ease
                               hover:bg-baseVioletSolid4
                               focus:outline-none focus:ring-2 focus:ring-baseVioletSolid6 focus:ring-offset-0"
                  >
                    LOGIN / SIGN UP
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default MainNav;
