"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/auth/user-context";
import { trackEvent } from "@/lib/analytics/tracking";
import { Logo } from "@/components/Logo";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, signOut } = useUser();

  const handleSignOut = () => {
    trackEvent("auth_logout_clicked", {
      source: "navigation",
      user_id: user?.id,
    });
    signOut();
  };

  return (
    <>
      {/* Navigation */}
      <nav className="bg-surface shadow-sm" aria-label="Primary">
        <div className="container mx-auto">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0" aria-label="DogYenta home">
                <Logo size="md" />
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-6">
                <Link
                  href="/find"
                  aria-current={pathname === '/find' ? 'page' : undefined}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                    pathname === '/find'
                      ? 'text-slate-900 font-semibold after:content-[""] after:block after:h-0.5 after:bg-slate-900 after:mt-1'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Find a Dog
                </Link>
                <Link
                  href="/about"
                  aria-current={pathname === '/about' ? 'page' : undefined}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                    pathname === '/about'
                      ? 'text-slate-900 font-semibold after:content-[""] after:block after:h-0.5 after:bg-slate-900 after:mt-1'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  About
                </Link>
                <Link
                  href="/pricing"
                  aria-current={pathname === '/pricing' ? 'page' : undefined}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                    pathname === '/pricing'
                      ? 'text-slate-900 font-semibold after:content-[""] after:block after:h-0.5 after:bg-slate-900 after:mt-1'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Pricing
                </Link>
                
                {/* Authentication Links */}
                {isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    <Link
                      href="/profile"
                      aria-current={pathname === '/profile' ? 'page' : undefined}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                        pathname === '/profile'
                          ? 'text-slate-900 font-semibold after:content-[""] after:block after:h-0.5 after:bg-slate-900 after:mt-1'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="btn-ghost-sm"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link 
                    href="/auth/signin" 
                    className="btn-ghost-sm"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle mobile menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-gray-200 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/find"
              aria-current={pathname === '/find' ? 'page' : undefined}
              className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-50 ${
                pathname === '/find'
                  ? 'text-slate-900 font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Find a Dog
            </Link>
            <Link
              href="/about"
              aria-current={pathname === '/about' ? 'page' : undefined}
              className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-50 ${
                pathname === '/about'
                  ? 'text-slate-900 font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/pricing"
              aria-current={pathname === '/pricing' ? 'page' : undefined}
              className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-50 ${
                pathname === '/pricing'
                  ? 'text-slate-900 font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            
            {/* Mobile Authentication Links */}
            {isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  aria-current={pathname === '/profile' ? 'page' : undefined}
                  className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-50 ${
                    pathname === '/profile'
                      ? 'text-slate-900 font-semibold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
