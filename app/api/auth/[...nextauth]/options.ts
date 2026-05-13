import { jwtDecode, type JwtPayload } from "jwt-decode";
import { AuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import KeycloakProvider from "next-auth/providers/keycloak";

/** Claims we read from Keycloak access tokens (see session callback). */
interface KeycloakJwtPayload extends JwtPayload {
  realm_access?: { roles?: string[] };
  email?: string;
  name?: string;
}

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    access_token?: string;
    id_token?: string;
    roles?: string[];
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    decoded?: KeycloakJwtPayload;
    access_token?: string;
    id_token?: string;
    expires_at?: number;
    refresh_token?: string;
    refresh_token_expires_at?: number;
    error?: string;
  }
}

/**
 * Refresh the access token using Keycloak's token endpoint.
 * Returns updated token or token with error if refresh fails.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    // Build the token endpoint URL from the issuer
    const issuer = process.env.AUTH_ISSUER!;
    const tokenEndpoint = `${issuer}/protocol/openid-connect/token`;

    const params = new URLSearchParams({
      client_id: process.env.KEYCLOAK_CLIENT_ID!,
      client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refresh_token!,
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("Token refresh failed:", refreshedTokens);
      throw new Error(refreshedTokens.error || "Failed to refresh token");
    }

    const newDecoded = jwtDecode<KeycloakJwtPayload>(
      refreshedTokens.access_token
    );

    return {
      ...token,
      access_token: refreshedTokens.access_token,
      id_token: refreshedTokens.id_token ?? token.id_token,
      expires_at: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
      refresh_token_expires_at: refreshedTokens.refresh_expires_in
        ? Math.floor(Date.now() / 1000) + refreshedTokens.refresh_expires_in
        : token.refresh_token_expires_at,
      decoded: newDecoded,
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.AUTH_ISSUER!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: extract tokens from Keycloak
      if (account && account.access_token) {
        token.decoded = jwtDecode<KeycloakJwtPayload>(account.access_token);
        token.access_token = account.access_token;
        token.id_token = account.id_token;
        token.expires_at = account.expires_at;
        token.refresh_token = account.refresh_token;
        // Store refresh token expiry if available (Keycloak provides this)
        token.refresh_token_expires_at = account.refresh_expires_in
          ? Math.floor(Date.now() / 1000) +
            (account.refresh_expires_in as number)
          : undefined;

        return token;
      }

      // Check if access token has expired (with 60 second buffer)
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = token.expires_at ?? 0;
      const bufferSeconds = 60; // Refresh 60 seconds before expiry

      if (now < expiresAt - bufferSeconds) {
        // Token is still valid
        return token;
      }

      // Check if refresh token has also expired
      if (
        token.refresh_token_expires_at &&
        now >= token.refresh_token_expires_at
      ) {
        console.log("Refresh token expired, user needs to re-authenticate");
        return {
          ...token,
          error: "RefreshTokenExpired",
        };
      }

      // Access token expired, try to refresh
      console.log("Access token expired, attempting refresh...");
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.access_token = token.access_token;
      session.id_token = token.id_token;
      session.roles = token.decoded?.realm_access?.roles ?? [];
      session.error = token.error;

      if (token.decoded?.email && session.user) {
        session.user.email = token.decoded.email;
      }
      if (token.decoded?.name && session.user) {
        session.user.name = token.decoded.name;
      }

      return session;
    },
  },
};
