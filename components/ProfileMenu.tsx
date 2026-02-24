"use client";

import { logout } from "@/lib/auth-helpers";
import Link from "next/link";
import { Avatar, Divider, Popover, Text } from "opub-ui";
import React from "react";

type Props = {
  user: { name?: string | null; email?: string | null };
  contentClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  maxHeight?: string; // CSS value, e.g., '40vh'
};

export function ProfileMenu({
  user,
  contentClassName,
  align = "end",
  side = "bottom",
  sideOffset = 4,
  maxHeight = "40vh",
}: Props) {
  const [open, setOpen] = React.useState(false);

  const handleSignOut = async () => {
    setOpen(false);
    await logout("/");
  };

  const logoutButtonClasses =
    "w-full rounded-lg border border-[#d8d1ff] bg-[#f2ecff] text-[#4c3ad1] text-sm font-medium transition-colors duration-150 hover:bg-[#e6ddff] focus:outline-none focus:ring-2 focus:ring-[#c4b6ff] focus:ring-offset-1";
  const dashboardLinkClasses =
    "block w-full text-left text-sm font-medium text-[#3a3a3a] py-2 px-0.5 rounded-lg border border-transparent transition-colors duration-150 hover:bg-[#f9f7ff] hover:border-[#efe9ff] hover:shadow-none";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <button
          className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity h-[44px] w-[44px] shrink-0"
          aria-label="Open profile"
        >
          <Avatar
            showInitials
            name={user?.name || user?.email || "User"}
            size="medium"
            tone="success"
          />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align={align}
        side={side}
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={`${contentClassName ? contentClassName + " " : ""} bg-white border border-gray-200 shadow-lg rounded-xl w-[min(260px,calc(100vw-32px))] max-w-[calc(100vw-32px)] max-h-[60vh] overflow-auto z-[2147483647]`}
      >
        <div className="p-3 min-w-[220px]">
          <div className="flex flex-col">
            <Text
              variant="bodyMd"
              className="font-medium text-gray-800 leading-tight"
            >
              {user?.name || "User"}
            </Text>
            <Text variant="bodySm" className="text-gray-700 leading-tight mt-1">
              {user?.email}
            </Text>
          </div>

          <div className="space-y-3 px-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className={`${dashboardLinkClasses} -mx-2`}
            >
              Dashboard
            </Link>

            <Divider className="my-2 border-gray-200" />

            <button
              onClick={handleSignOut}
              className={`${logoutButtonClasses} py-2`}
            >
              Log Out
            </button>
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
}
