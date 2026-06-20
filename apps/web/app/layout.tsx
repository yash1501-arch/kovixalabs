import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "KOVIXAILABS AISMOS - AI Social Media Operating System",
  description:
    "The AI-native social media operating system. Brand memory, content generation, trend analysis, and publishing, all powered by AI.",
  keywords: [
    "AI",
    "social media",
    "content generation",
    "brand management",
    "SaaS",
    "AISMOS",
    "KOVIXAILABS"
  ]
};

export const viewport: Viewport = {
  themeColor: "#030305"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
