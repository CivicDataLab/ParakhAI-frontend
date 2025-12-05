'use client';

import { signIn, signOut, useSession } from "next-auth/react";
import dynamic from 'next/dynamic';

// Dynamically import components that use opub-ui to avoid SSR issues
const MainNav = dynamic(() => import("@/app/[locale]/dashboard/components/main-nav"), { ssr: false });
const MainFooter = dynamic(() => import("@/app/[locale]/dashboard/components/main-footer"), { ssr: false });

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="home-page-container">
      <MainNav />
      <main className="home-main-content">
      <h1 className="home-title">
        ParakhAI
      </h1>
      
      {!session ? (
        <div>
          <p className="home-subtitle">
            AI Authentication Platform
          </p>
          <button 
            onClick={() => signIn("keycloak")}
            className="sign-in-button"
          >
            Sign in with Keycloak
          </button>
        </div>
      ) : (
        <div>
          <h2 className="greeting-title">
            Hello, {session.user?.name || session.user?.email}!
          </h2>
          <p className="greeting-text">
            You are successfully signed in
          </p>
          <button 
            onClick={() => signOut()}
            className="sign-out-button"
          >
            Sign out
          </button>
        </div>
      )}
      </main>
      <MainFooter />
    </div>
  );
}
