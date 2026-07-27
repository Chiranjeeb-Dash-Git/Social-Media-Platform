import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { MessengerPopup } from "@/components/MessengerPopup";

export const metadata: Metadata = {
  title: "SocialPulse - Next-Gen Social Network",
  description: "Full-Featured Facebook & Reddit Social Media Platform with Cinematic UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <Navbar />
          {children}
          <MessengerPopup />
        </Providers>
      </body>
    </html>
  );
}
