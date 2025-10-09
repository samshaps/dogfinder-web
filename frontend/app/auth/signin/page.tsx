"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <div style={{ padding: 24, border: "1px solid #e5e7eb", borderRadius: 12, maxWidth: 420, width: "100%" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Sign in</h1>
        <p style={{ color: "#6b7280", marginBottom: 16 }}>Continue with your Google account.</p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          style={{
            width: "100%",
            background: "#2563eb",
            color: "white",
            borderRadius: 8,
            padding: "12px 16px",
            fontWeight: 600,
          }}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}


