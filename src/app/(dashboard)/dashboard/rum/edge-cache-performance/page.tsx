import { Metadata } from "next";
import { Main } from ".";

export const metadata: Metadata = {
  title: "Edge Cache Performance | Speedy Site",
  description:
    "Minitor your edge cache effectiveness and requests hitting origin server + impact on TTFB.",
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
    title: "Edge Cache Performance | Speedy Site",
    description:
      "Minitor your edge cache effectiveness and requests hitting origin server + impact on TTFB.",
    url: "https://speedy.site/rum/edge-cache-performance",
    siteName: "Speedy Site",
    images: [
      {
        url: "/images/homepage/Cache-Efficiency.png",
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
    images: ["/images/homepage/Cache-Efficiency.png"],
  },
};

export default function CacheEfficiency() {
  return <Main />;
}
