"use client";

import { useUser } from "@/lib/auth/user-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/tracking";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  fallback,
  redirectTo = "/auth/signin" 
}: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      trackEvent("auth_protected_route_accessed", {
        redirect_to: redirectTo,
        authenticated: false,
      });
      
      // Preserve current path as returnTo parameter
      const currentPath = window.location.pathname + window.location.search;
      const returnTo = encodeURIComponent(currentPath);
      const signInUrl = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}returnTo=${returnTo}`;
      
      router.push(signInUrl);
    }
  }, [user, isLoading, router, redirectTo]);

  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return fallback || null;
  }

  return <>{children}</>;
}

// Hook for checking if user can access a route
export function useRequireAuth(redirectTo: string = "/auth/signin") {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      trackEvent("auth_route_required", {
        redirect_to: redirectTo,
        authenticated: false,
      });
      
      // Preserve current path as returnTo parameter
      const currentPath = window.location.pathname + window.location.search;
      const returnTo = encodeURIComponent(currentPath);
      const signInUrl = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}returnTo=${returnTo}`;
      
      router.push(signInUrl);
    }
  }, [user, isLoading, router, redirectTo]);

  return { user, isLoading, isAuthenticated: !!user };
}
