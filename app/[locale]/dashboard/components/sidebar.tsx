"use client";

import { Icons } from "@/components/icons";
import { logout } from "@/lib/auth-helpers";
import { Session } from "next-auth";
import { signIn } from "next-auth/react";
import Link from "next/link";
import {
    Avatar,
    Button,
    Divider,
    Icon,
    IconButton,
    Popover,
    Sheet,
    Spinner,
    Text,
} from "opub-ui";
import React from "react";

type NavItem = { label: string; href: string };

export default function Sidebar({
  open,
  setOpen,
  data,
  session,
  status,
}: {
  open: boolean;
  setOpen: (next: boolean) => void;
  data: NavItem[];
  session: Session | null;
  status: "authenticated" | "loading" | "unauthenticated";
}) {
  const loginButtonClasses = "login-signup-button w-full";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Sheet.Content className={"p-4 overflow-y-auto overflow-x-visible"}>
        <div className="flex flex-row justify-between">
          <div className="flex-1">
            {data.map((item, index) => {
              const isExternal =
                item.href.startsWith("http://") ||
                item.href.startsWith("https://");
              return (
                <div key={index} className="mb-1 px-1 py-2">
                  <Link
                    href={item.href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <Text variant="headingSm" as="h1" color={"highlight"}>
                      {item.label}
                    </Text>
                  </Link>
                </div>
              );
            })}
            {status === "loading" ? (
              <Spinner />
            ) : (
              <div>
                {session?.user ? (
                  <ProfileContent
                    session={session}
                    onClose={() => setOpen(false)}
                  />
                ) : (
                  <Button
                    onClick={() => {
                      signIn("keycloak");
                    }}
                    className={loginButtonClasses}
                  >
                    LOGIN / SIGN UP
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="mb-2 flex h-fit w-fit justify-end">
            <Button onClick={() => setOpen(false)} kind="tertiary">
              <Icon source={Icons.cross} size={24} color="default" />
            </Button>
          </div>
        </div>
      </Sheet.Content>
    </Sheet>
  );
}

export function ProfileContent({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const logoutButtonClasses =
    "w-full rounded-lg border border-[#d8d1ff] bg-[#f2ecff] text-[#4c3ad1] text-sm font-medium transition-colors duration-150 hover:bg-[#e6ddff] focus:outline-none focus:ring-2 focus:ring-[#c4b6ff] focus:ring-offset-1";
  const dashboardLinkClasses =
    "block w-full text-left text-sm font-medium text-[#3a3a3a] py-2 px-3 rounded-lg border border-transparent transition-colors duration-150 hover:bg-[#f9f7ff] hover:border-[#efe9ff] hover:shadow-none";

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <Popover.Trigger asChild>
          {/* Remove all manual onClick handlers - let Popover.Trigger handle it */}
          {session.user?.image ? (
            <IconButton icon={session.user.image} size="slim">
              {session.user.name}
            </IconButton>
          ) : (
            <div
              style={
                {
                  "--border-highlight-subdued": "var(--accent-tertiary-color)",
                } as React.CSSProperties
              }
            >
              <Button
                kind="tertiary"
                size="slim"
                className="rounded-full hover:no-underline"
              >
                <Avatar
                  showInitials
                  name={session.user?.name || "User"}
                  size="small"
                />
              </Button>
            </div>
          )}
        </Popover.Trigger>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="p-0 w-[min(260px,calc(100vw-32px))] max-w-[calc(100vw-32px)] bg-white border border-gray-200 shadow-lg rounded-xl z-[100000] mb-0"
          style={{ zIndex: 100000, marginBottom: 0 }}
        >
          <div className="px-4 pt-3 pb-2">
            <Text
              variant="bodyMd"
              fontWeight="medium"
              className="text-gray-800 block"
            >
              {session.user?.name || "User"}
            </Text>
            <Text variant="bodySm" className="text-gray-700 block mt-0.5">
              {session.user?.email}
            </Text>
          </div>
          <div className="px-2 pb-3 space-y-3">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className={`${dashboardLinkClasses} -mx-2`}
            >
              Dashboard
            </Link>

            <Divider className="my-2" />

            <button
              onClick={() => {
                setOpen(false);
                onClose();
                logout("/");
              }}
              className={`${logoutButtonClasses} py-2`}
            >
              Log Out
            </button>
          </div>
        </Popover.Content>
      </Popover>
    </div>
  );
}
