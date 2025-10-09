"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { trackEvent } from "@/lib/analytics/tracking";

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  provider: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (session?.user) {
      const userData: User = {
        id: session.user.email || "",
        email: session.user.email || "",
        name: session.user.name || "",
        image: session.user.image || undefined,
        provider: "google",
      };
      setUser(userData);
      
      // Track successful login
      trackEvent("auth_login_success", {
        provider: "google",
        user_id: userData.id,
      });
    } else {
      setUser(null);
    }
  }, [session]);

  const handleSignOut = async () => {
    trackEvent("auth_logout", {
      user_id: user?.id,
    });
    
    await signOut({ callbackUrl: "/" });
  };

  const value: UserContextType = {
    user,
    isLoading: status === "loading",
    isAuthenticated: !!user,
    signOut: handleSignOut,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
