"use client";

import { createContext, useContext } from "react";

export type OrganizationContextType = {
  organization: {
    name: string;
    logoUrl: string | null;
  } | null;
  isLoading: boolean;
};

export const OrganizationContext = createContext<OrganizationContextType>({
  organization: null,
  isLoading: true,
});

export const useOrganization = () => useContext(OrganizationContext);
