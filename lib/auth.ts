import { signOut as nextAuthSignOut } from 'next-auth/react';

export async function logout(callbackUrl: string = '/') {
  try {
    const response = await fetch('/api/auth/logout', { method: 'GET' });
    const data = await response.json();

    await nextAuthSignOut({ redirect: false });

    if (data.url) {
      window.location.href = data.url;
    } else {
      window.location.href = callbackUrl;
    }
  } catch (err) {
    console.error('Logout error:', err);
    window.location.href = callbackUrl;
  }
}
