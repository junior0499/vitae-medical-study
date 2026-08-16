import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { OfflineManager } from "@/components/offline-manager";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const title = "Poh-tah-toh — Medical Study Companion";
const description = "A calm, focused study dashboard built around the way medical students actually learn.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "Poh-tah-toh",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/cat-icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/cat-icon-192.png", type: "image/png", sizes: "192x192" }],
  },
  openGraph: { type: "website", title, description },
  twitter: { card: "summary", title, description },
};

export const viewport: Viewport = {
  themeColor: "#f3f5ef",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={geist.variable}>{children}<OfflineManager /></body>
    </html>
  );
}
