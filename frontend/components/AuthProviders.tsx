"use client";

import { SessionProvider } from "next-auth/react";
import { UserProvider } from "@/lib/auth/user-context";

interface AuthProvidersProps {
  children: React.ReactNode;
}

export function AuthProviders({ children }: AuthProvidersProps) {
  return (
    <SessionProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </SessionProvider>
  );
}
