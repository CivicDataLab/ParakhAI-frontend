"use client";

import { useAppSession } from "@/lib/session";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Divider } from "opub-ui";
import { useEffect, useMemo, useState } from "react";

export type NavItem = {
  icon: string;
  label: string;
  isImage: boolean;
  path?: string;
};

const aiMakerNavItems: NavItem[] = [
  {
    icon: "/images/icons/home-2.png",
    label: "Home",
    isImage: true,
    path: "/dashboard/ai-maker",
  },
  {
    icon: "/images/icons/topology-star-ring.png",
    label: "Models",
    isImage: true,
    path: "/dashboard/ai-maker/ai-models",
  },
  {
    icon: "/images/icons/report-analytics.png",
    label: "Evaluations",
    isImage: true,
    path: "/dashboard/ai-maker/evaluations",
  },
  {
    icon: "/images/icons/messages.png",
    label: "Prompt Libraries",
    isImage: true,
    path: "/dashboard/ai-maker/prompt-libraries",
  },
  {
    icon: "/images/icons/users-group.png",
    label: "Evaluators",
    isImage: true,
    path: "/dashboard/ai-maker/auditors",
  },
  // { icon: "/images/icons/settings.png", label: "Settings", isImage: true },
];

export const auditorNavItems: NavItem[] = [
  {
    icon: "/images/icons/home-2.png",
    label: "Home",
    isImage: true,
    path: "/dashboard/auditor",
  },
  {
    icon: "/images/icons/topology-star-ring.png",
    label: "Assigned Models",
    isImage: true,
    path: "/dashboard/auditor/assignments",
  },
  {
    icon: "/images/icons/report-analytics.png",
    label: "Evaluations",
    isImage: true,
    path: "/dashboard/auditor/evaluations",
  },
  // { icon: "/images/icons/settings.png", label: "Settings", isImage: true },
];

export type DashboardType = "ai-maker" | "auditor";

type WelcomeSectionProps = {
  orgName?: string;
  orgLogo?: string | null;
  dashboardType?: DashboardType;
  navItems?: NavItem[];
  basePath?: string;
  orgIdInPath?: string | null;
};

const WelcomeSection = ({
  orgName,
  orgLogo,
  dashboardType = "ai-maker",
  navItems: customNavItems,
  basePath,
  orgIdInPath: customOrgId,
}: WelcomeSectionProps) => {
  const baseNavItems =
    customNavItems ||
    (dashboardType === "auditor" ? auditorNavItems : aiMakerNavItems);
  const dashboardBasePath =
    basePath ||
    (dashboardType === "auditor"
      ? "/dashboard/auditor"
      : "/dashboard/ai-maker");
  const pathname = usePathname();
  const { user } = useAppSession();
  const dataspaceUrl = process.env.NEXT_PUBLIC_DATASPACE_API_URL || "";
  const [isImageValid, setIsImageValid] = useState(!!orgLogo);

  useEffect(() => {
    setIsImageValid(!!orgLogo);
  }, [orgLogo]);

  const normalizedPath = useMemo(() => {
    if (!pathname) return "/";

    const validLocales = ["en", "hi"];
    const match = pathname.match(/^\/([^/]+)/);
    let withoutLocale = pathname;

    if (match && validLocales.includes(match[1])) {
      withoutLocale = pathname.replace(/^\/[^/]+/, "") || "/";
    }

    return withoutLocale.endsWith("/") && withoutLocale.length > 1
      ? withoutLocale.slice(0, -1)
      : withoutLocale;
  }, [pathname]);

  const orgIdFromPath = useMemo(() => {
    if (customOrgId !== undefined) return customOrgId;

    if (dashboardType !== "ai-maker") return null;

    const parts = normalizedPath.split("/");
    if (
      parts[1] === "dashboard" &&
      parts[2] === "ai-maker" &&
      parts[3] &&
      !["ai-models", "evaluations", "prompt-libraries", "auditors"].includes(
        parts[3]
      )
    ) {
      return parts[3];
    }
    return null;
  }, [normalizedPath, customOrgId, dashboardType]);

  const matchingPath = useMemo(() => {
    if (!orgIdFromPath) return normalizedPath;
    return normalizedPath.replace(
      `${dashboardBasePath}/${orgIdFromPath}`,
      dashboardBasePath
    );
  }, [normalizedPath, orgIdFromPath, dashboardBasePath]);

  const [selectedItem, setSelectedItem] = useState<string>(() => {
    const activeFromPath = baseNavItems
      .filter((item) => item.path)
      .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))
      .find((item) => {
        if (!item.path) return false;
        return (
          matchingPath === item.path || matchingPath.startsWith(`${item.path}/`)
        );
      });
    return activeFromPath ? activeFromPath.label : "Home";
  });

  const localePrefix = useMemo(() => {
    if (!pathname) return "";
    const match = pathname.match(/^\/([^/]+)/);
    if (!match) return "";
    const firstSegment = match[1];
    const validLocales = ["en", "hi"];
    return validLocales.includes(firstSegment) ? `/${firstSegment}` : "";
  }, [pathname]);

  const navItems = useMemo(
    () =>
      baseNavItems.map((item) => {
        let href = item.path ? `${localePrefix}${item.path}` : "#";

        if (
          orgIdFromPath &&
          item.path &&
          item.path.startsWith(dashboardBasePath)
        ) {
          const pathSuffix = item.path.replace(dashboardBasePath, "");
          if (pathSuffix === "") {
            href = `${localePrefix}${dashboardBasePath}/${orgIdFromPath}`;
          } else {
            href = `${localePrefix}${dashboardBasePath}/${orgIdFromPath}${pathSuffix}`;
          }
        }

        return {
          ...item,
          href,
          path: item.path,
        };
      }),
    [localePrefix, orgIdFromPath, baseNavItems, dashboardBasePath]
  );

  useEffect(() => {
    let activeFromPath = navItems
      .filter((item) => item.path)
      .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))
      .find((item) => {
        if (!item.path) return false;
        return (
          matchingPath === item.path || matchingPath.startsWith(`${item.path}/`)
        );
      });

    if (activeFromPath) {
      setSelectedItem(activeFromPath.label);
    }
  }, [navItems, matchingPath]);

  return (
    <div className="welcome-section mt-12 sm:mt-8 lg:mt-14">
      <div className="text-center sm:pt-4 md:pt-0">
        {dashboardType === "auditor" && (
          <div className="mb-3 sm:mb-4 flex justify-center">
            <div className="w-[80px] h-[80px] rounded-full bg-[var(--primary-purple-color2)] flex items-center justify-center shrink-0">
              <span className="text-white text-2xl font-semibold select-none tracking-wide">
                {(user?.name || user?.email || "E")
                  .split(" ")
                  .map((w: string) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 3)}
              </span>
            </div>
          </div>
        )}

        {dashboardType !== "auditor" && (
          <div className="mb-3 sm:mb-4 flex justify-center">
            <div className="cdl-logo-container">
              {orgLogo && isImageValid ? (
                <Image
                  src={`${dataspaceUrl.replace(/\/$/, "")}${orgLogo}`}
                  alt={`${orgName} Logo`}
                  width={140}
                  height={140}
                  onError={() => setIsImageValid(false)}
                  className="object-contain w-full h-full"
                />
              ) : (
                <Image
                  src="/images/logos/parakhai-logo.png"
                  alt="ParakhAI Logo"
                  width={140}
                  height={140}
                  className="object-contain w-full h-full"
                />
              )}
            </div>
          </div>
        )}

        <p className="welcome-text sm:pt-4 md:pt-0">
          {"Welcome,\u00A0"}
          <span className="break-words">
            {user?.name ||
              orgName ||
              (dashboardType === "auditor" ? "Auditor" : "CivicDataLab")}
          </span>
        </p>

        <Link
          href="/dashboard"
          className="mt-3 sm:mt-4 mb-3 sm:mb-4 inline-flex font-medium text-[#644FC1] underline transition-colors hover:opacity-90 switch-roles-link"
        >
          Switch Roles
        </Link>
      </div>

      <div className="welcome-divider mt-3 sm:mt-4 mb-3 sm:mb-4">
        <Divider />
      </div>
      <nav className="space-y-1 sm:space-y-2 overflow-visible mx-0 sm:mx-1">
        {navItems.map((item) => {
          const isActive = selectedItem === item.label;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(event) => {
                if (item.href === "#") {
                  event.preventDefault();
                }
                setSelectedItem(item.label);
              }}
              className={`py-2.5 sm:py-2 text-left transition flex items-center nav-item-link min-w-0 ${
                isActive
                  ? "font-semibold text-black bg-[#3b00ff0d] -mx-2 sm:-mx-3 w-[calc(100%+16px)] sm:w-[calc(100%+24px)] border-solid border-primaryPurple border-l-4 px-4 sm:px-6"
                  : "hover:bg-gray-100 rounded-md text-[#60646C] pl-3 sm:pl-4 font-medium px-2 sm:px-3 w-full"
              }`}
            >
              <span className="mr-2 sm:mr-2.5 pt-1 inline-block shrink-0">
                {item.isImage ? (
                  <Image
                    src={item.icon}
                    alt={item.label}
                    width={16}
                    height={16}
                    className="nav-icon-inactive"
                  />
                ) : (
                  item.icon
                )}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default WelcomeSection;
