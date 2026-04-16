import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = "https://yudoku.jerkeyray.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Yudoku",
  description: "The Youtube Course Experience Platform",

  openGraph: {
    title: "Yudoku",
    description: "The Youtube Course Experience Platform",
    url: siteUrl,
    siteName: "Yudoku",
    images: [
      {
        url: `${siteUrl}/og.jpg`,
        width: 1200,
        height: 630,
        alt: "Yudoku platform thumbnail",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Yudoku",
    description: "The Youtube Course Experience Platform",
    images: [`${siteUrl}/og.jpg`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Analytics />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
