import type { Metadata } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StreamFlix — Cinematic streaming, reimagined",
  description:
    "Award-winning originals, blockbuster cinema, and prestige series — mastered in 4K HDR with Dolby Atmos.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://streamflix.example.com",
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bebas.variable} ${manrope.variable} dark bg-background text-foreground antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
