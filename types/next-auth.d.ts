import { DefaultJWT, DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    access_token?: string;
    id_token?: string;
    roles?: string[];
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    access_token?: string;
    id_token?: string;
    expires_at?: number;
    refresh_token?: string;
    decoded?: {
      email?: string;
      name?: string;
      realm_access?: {
        roles?: string[];
      };
    };
    error?: string;
  }
}
