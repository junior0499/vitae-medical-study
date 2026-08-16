import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import { OfflineManager } from "@/components/offline-manager";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const title = "Vitae — Medical Study Companion";
const description = "A calm, focused study dashboard built around the way medical students actually learn.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host")?.trim();
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https";
  let origin = "https://vitae-medical-study.chatgpt.site";
  if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    try {
      origin = new URL(`${protocol}://${host}`).origin;
    } catch {
      // Keep the production fallback when forwarded host information is malformed.
    }
  }
  const image = `${origin}/og.png`;

  return {
    title,
    description,
    applicationName: "Vitae",
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      title,
      description,
      images: [{ url: image, width: 1731, height: 909, alt: "Vitae — Medicine, made learnable" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

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
