import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AuthProvider } from "@/contexts/auth-context"; // Added

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
            {" "}
            {/* Added AuthProvider Wrapper */}
            <NextTopLoader
              color="hsl(var(--primary))"
              initialPosition={0.08}
              crawlSpeed={200}
              height={3}
              crawl={true}
              showSpinner={true}
              easing="ease"
              speed={200}
              shadow="0 0 10px hsl(var(--primary)),0 0 5px hsl(var(--primary))"
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
