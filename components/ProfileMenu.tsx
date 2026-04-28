"use client";

import { logout } from "@/lib/auth-helpers";
import Link from "next/link";
import { Avatar, Button, Divider, Popover, Text } from "opub-ui";
import React from "react";

type Props = {
  user: { name?: string | null; email?: string | null };
  contentClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
};

const profileLinks = [{ href: "/dashboard", label: "Evaluation Workspace" }];

export function ProfileMenu({
  user,
  contentClassName,
  align = "end",
  side = "bottom",
  sideOffset = 4,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const handleSignOut = async () => {
    setOpen(false);
    await logout("/");
  };

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
        sideOffset={sideOffset}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={`${contentClassName ?? ""} w-[min(260px,calc(100vw-32px))] min-w-[220px] max-w-[calc(100vw-32px)] max-h-[60vh] overflow-auto z-[2147483647] p-0`}
      >
        <div className="rounded-3 py-2 shadow-basicDeep bg-white">
          <div className="flex flex-col px-5 py-2">
            <Text variant="bodyMd" fontWeight="medium" className="text-textDefault">
              {user?.name || "User"}
            </Text>
            <Text variant="bodyMd" className="text-textDefault">
              {user?.email}
            </Text>
          </div>
          <div className="flex w-full flex-col">
            {profileLinks.map((link) => (
              <Text variant="bodyMd" key={link.href}>
                <Link
                  onClick={() => setOpen(false)}
                  href={link.href}
                  className="block w-full px-5 py-2 text-textSubdued transition-colors duration-100 ease-ease hover:bg-actionSecondaryNeutralHovered hover:text-textDefault"
                >
                  {link.label}
                </Link>
              </Text>
            ))}
          </div>
          <Divider className="mx-3 my-3 w-auto" />
          <div className="px-3">
            <Button
              kind="secondary"
              size="slim"
              fullWidth
              onClick={handleSignOut}
            >
              Log Out
            </Button>
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
}
