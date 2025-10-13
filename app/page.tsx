'use client';

import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main style={{ textAlign: "center", marginTop: "5rem", padding: "20px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "#6366f1" }}>
        ParakhAI
      </h1>
      
      {!session ? (
        <div>
          <p style={{ marginBottom: "2rem", fontSize: "1.2rem" }}>
            Welcome to ParakhAI Platform
          </p>
          <button 
            onClick={() => signIn("keycloak")}
            style={{
              padding: "12px 32px",
              fontSize: "16px",
              cursor: "pointer",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
            }}
          >
            Sign in with Keycloak
          </button>
        </div>
      ) : (
        <div>
          <h2 style={{ marginBottom: "1rem" }}>
            Hello, {session.user?.name || session.user?.email}!
          </h2>
          <p style={{ marginBottom: "2rem", color: "#666" }}>
            You are successfully signed in
          </p>
          <button 
            onClick={() => signOut()}
            style={{
              padding: "12px 32px",
              fontSize: "16px",
              cursor: "pointer",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </main>
  );
}