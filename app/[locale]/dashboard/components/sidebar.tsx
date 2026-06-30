"use client";

import { Icons } from "@/components/icons";
import { logout } from "@/lib/auth";
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
  const loginButtonClasses =
    "w-full bg-secondaryGreen text-black text-base font-medium uppercase py-3 px-6 rounded-lg border border-transparent inline-flex items-center justify-center transition-all duration-150 ease rounded-2 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-baseVioletSolid6 focus:ring-offset-0";

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

const profileLinks = [{ href: "/dashboard", label: "Evaluation Workspace" }];

export function ProfileContent({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  const handleSignOut = async () => {
    setOpen(false);
    onClose();
    await logout("/");
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <Popover.Trigger asChild>
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
          className="p-0 w-[min(260px,calc(100vw-32px))] min-w-[220px] max-w-[calc(100vw-32px)] z-[100000] mb-0"
          style={{ zIndex: 100000, marginBottom: 0 }}
        >
          <div className="rounded-3 py-2 shadow-basicDeep bg-white">
            <div className="flex flex-col px-5 py-2">
              <Text
                variant="bodyMd"
                fontWeight="medium"
                className="text-textDefault"
              >
                {session.user?.name || "User"}
              </Text>
              <Text variant="bodyMd" className="text-textDefault">
                {session.user?.email}
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
    </div>
  );
}
