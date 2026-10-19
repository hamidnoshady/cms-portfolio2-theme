import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { siteOrigin } from "@/lib/cms/client";
import { getSiteSettings } from "@/lib/content";
import "./globals.css";

export const dynamic = "force-dynamic";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: {
      default: `${settings.studioName} — ${settings.tagline}`,
      template: `%s — ${settings.studioName}`,
    },
    description: settings.footerNote,
    metadataBase: new URL(siteOrigin()),
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
