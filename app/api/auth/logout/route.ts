import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getServerSession } from 'next-auth';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (session) {
    const idToken = session.id_token;

    const issuer = process.env.AUTH_ISSUER!;
    const logoutUrl = `${issuer}/protocol/openid-connect/logout`;
    
    const params = new URLSearchParams({
      id_token_hint: idToken || '',
      post_logout_redirect_uri: process.env.NEXTAUTH_URL || '',
    });

    const url = `${logoutUrl}?${params.toString()}`;

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({ url: process.env.NEXTAUTH_URL || '/' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
