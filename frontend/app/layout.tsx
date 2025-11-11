import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProviders } from "@/components/AuthProviders";
import Navigation from "@/components/Navigation";
import { appConfig } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DogYenta",
    template: "%s | DogYenta",
  },
  description: "Find your perfect rescue dog with DogYenta",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const analyticsEnabled = !!(appConfig.umamiScriptUrl && appConfig.umamiWebsiteId);

  return (
    <html lang="en">
      <head>
        {/* Umami Analytics */}
        {analyticsEnabled && (
          <Script
            src={appConfig.umamiScriptUrl!}
            data-website-id={appConfig.umamiWebsiteId}
            strategy="afterInteractive"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProviders>
          <ErrorBoundary>
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <Navigation />
            <main id="main-content" tabIndex={-1}>
              {children}
            </main>
          </ErrorBoundary>
        </AuthProviders>
      </body>
    </html>
  );
}
