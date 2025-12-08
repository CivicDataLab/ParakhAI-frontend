import { jwtDecode } from "jwt-decode";
import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

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
        
        // Debug: Log what we're saving
        console.log('🔑 Saved tokens:', {
          hasAccessToken: !!token.access_token,
          hasIdToken: !!token.id_token,
          tokenPreview: token.access_token ? `${token.access_token.substring(0, 20)}...` : 'Missing',
          decodedEmail: token.decoded?.email,
          decodedName: token.decoded?.name,
          roles: token.decoded?.realm_access?.roles ?? [],
        });
      }
      
      // Always return token (persist it across requests)
      return token;
    },
    async session({ session, token }) {
      // Add tokens and roles to session object
      // Debug: Log what we're adding to session
      console.log('📋 Session Callback - Adding to session:', {
        hasAccessToken: !!token.access_token,
        hasIdToken: !!token.id_token,
        tokenPreview: token.access_token ? `${token.access_token.substring(0, 20)}...` : 'Missing',
        sessionEmail: session.user?.email,
        tokenDecodedEmail: token.decoded?.email,
      });
      
      session.access_token = token.access_token;
      session.id_token = token.id_token;
      session.roles = token.decoded?.realm_access?.roles ?? [];
      session.error = token.error;
      
      // Use email from decoded token if available (more reliable than session.user.email)
      if (token.decoded?.email && session.user) {
        session.user.email = token.decoded.email;
      }
      if (token.decoded?.name && session.user) {
        session.user.name = token.decoded.name;
      }
      
      return session;
    },
  },
});

export { handler as GET, handler as POST };
