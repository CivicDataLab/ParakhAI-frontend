import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { jwtDecode } from "jwt-decode";

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
    decoded?: any;
    access_token?: string;
    id_token?: string;
    expires_at?: number;
    refresh_token?: string;
  }
}

const handler = NextAuth({
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
      // When user signs in (first time), extract tokens and roles from Keycloak
      if (account && account.access_token) {
        token.decoded = jwtDecode(account.access_token);
        token.access_token = account.access_token;
        token.id_token = account.id_token;
        token.expires_at = account.expires_at;
        token.refresh_token = account.refresh_token;
      }
      
      // Always return token (persist it across requests)
      return token;
    },
    async session({ session, token }) {
      // Add tokens and roles to session object
      if (token.access_token) {
        session.access_token = token.access_token;
      }
      if (token.id_token) {
        session.id_token = token.id_token;
      }
      if (token.decoded) {
        session.roles = (token.decoded as any)?.realm_access?.roles as string[] ?? [];
      }
      if (token.error) {
        session.error = token.error as string;
      }
      
      // Use email from decoded token if available (more reliable than session.user.email)
      if (session.user && token.decoded) {
        const decoded = token.decoded as any;
        if (decoded.email && !session.user.email) {
          session.user.email = decoded.email;
        }
        if (decoded.name && !session.user.name) {
          session.user.name = decoded.name;
        }
      }
      
      return session;
    },
  },
});

export { handler as GET, handler as POST };
