import { Metadata } from "next";
import { Main } from ".";

export const metadata: Metadata = {
  title: "Cache Efficiency",
  description:
    "Real-time and historical origin server hits for your site, aggregated from real user monitoring data.",
  keywords: [
    "origin hit",
    "RUM",
    "analytics",
    "SaaS monitoring",
    "performance",
    "CDN",
    "cache",
  ],
  authors: [{ name: "Speedy Site" }],
  robots: "index, follow",
  openGraph: {
    title: "Cache Efficiency",
    description:
      "View origin hit percentages for all your monitored sites in real-time.",
    url: "https://speedy.site/origin-hits",
    siteName: "Speedy Site",
    images: [
      {
        url: "https://your-saas-domain.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Origin Hit Analytics",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cache Efficiency",
    description: "View origin server hit percentages for your monitored sites.",
    images: ["https://your-saas-domain.com/og-image.png"],
  },
};

export default function CacheEfficiency() {
  return <Main />;
}
