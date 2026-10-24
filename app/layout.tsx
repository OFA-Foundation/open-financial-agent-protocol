import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { DESCRIPTION, SITE_NAME, SITE_URL } from "../lib/site";
import "./tokens.css";
import "./globals.css";

// The font files of the OFAP Design System, served from this site.
const sans = localFont({
  src: [
    { path: "./fonts/IBMPlexSans-Variable.woff2", weight: "100 700", style: "normal" },
    { path: "./fonts/IBMPlexSans-Italic-Variable.woff2", weight: "100 700", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
});
const mono = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} (AIP)`, template: "%s · AIP" },
  description: DESCRIPTION,
  openGraph: { siteName: SITE_NAME, title: `${SITE_NAME} (AIP)`, description: DESCRIPTION, url: "/", type: "website" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1322" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
