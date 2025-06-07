import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import FooterBar from "@/components/footerBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Donation App",
  description: "A donation collection and management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        <FooterBar />
      </body>
    </html>
  );
}
