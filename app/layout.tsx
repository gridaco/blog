import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { site, absoluteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: { default: site.name, template: "%s — Grida" },
  description: site.description,
  icons: { icon: "/blog/img/favicon.ico" },
  alternates: {
    types: {
      "application/rss+xml": absoluteUrl("/rss.xml"),
      "application/atom+xml": absoluteUrl("/atom.xml"),
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main id="main-content" className="site-shell">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
