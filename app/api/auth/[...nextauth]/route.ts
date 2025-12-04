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
    async jwt({ token, account, user }) {
      // When user signs in (first time), extract tokens and roles from Keycloak
      if (account) {
        console.log('🔑 JWT Callback - Initial sign in, saving tokens');
        token.decoded = jwtDecode(account.access_token as string);
        token.access_token = account.access_token;
        token.id_token = account.id_token;
        token.expires_at = account.expires_at;
        token.refresh_token = account.refresh_token;
        
        // Debug: Log what we're saving
        console.log('🔑 Saved tokens:', {
          hasAccessToken: !!token.access_token,
          hasIdToken: !!token.id_token,
          tokenPreview: token.access_token ? `${token.access_token.substring(0, 20)}...` : 'Missing',
          decodedEmail: (token.decoded as any)?.email,
          decodedName: (token.decoded as any)?.name,
          roles: ((token.decoded as any)?.realm_access?.roles as string[]) ?? [],
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
        tokenDecodedEmail: (token.decoded as any)?.email,
      });
      
      (session as any).access_token = token.access_token as string;
      (session as any).id_token = token.id_token as string;
      (session as any).roles =
        ((token.decoded as any)?.realm_access?.roles as string[]) ?? [];
      (session as any).error = token.error as string;
      
      // Use email from decoded token if available (more reliable than session.user.email)
      if ((token.decoded as any)?.email && !session.user?.email) {
        session.user.email = (token.decoded as any).email;
      }
      if ((token.decoded as any)?.name && !session.user?.name) {
        session.user.name = (token.decoded as any).name;
      }
      
      return session;
    },
  },
});

export { handler as GET, handler as POST };
