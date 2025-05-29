import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AuthProvider } from "@/contexts/auth-context"; // Added

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DealFlow CRM",
  description: "Manage contacts, companies, and deals with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <NextTopLoader
              color="#059669" // emerald-600
              initialPosition={0.08}
              crawlSpeed={200}
              height={3}
              crawl={true}
              showSpinner={false}
              easing="ease"
              speed={200}
              shadow="0 0 10px #059669,0 0 5px #059669"
            />
            {children}
            <Toaster />
          </AuthProvider>{" "}
          {/* Closed AuthProvider Wrapper */}
        </ThemeProvider>
      </body>
    </html>
  );
}
