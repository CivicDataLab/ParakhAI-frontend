import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { jwtDecode } from "jwt-decode";

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
      // When user signs in, extract tokens and roles from Keycloak
      if (account) {
        token.decoded = jwtDecode(account.access_token as string);
        token.access_token = account.access_token;
        token.id_token = account.id_token;
        token.expires_at = account.expires_at;
        token.refresh_token = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Add tokens and roles to session object
      (session as any).access_token = token.access_token as string;
      (session as any).id_token = token.id_token as string;
      (session as any).roles =
        ((token.decoded as any)?.realm_access?.roles as string[]) ?? [];
      (session as any).error = token.error as string;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
