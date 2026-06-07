import { Metadata } from "next";
import { Main } from ".";

export const metadata: Metadata = {
  title: "Server & Connection Diagnostics | Speedy Site",
  description:
    "Analyze DNS, TCP, TLS, backend response time, request queueing, cache efficiency, and TTFB impact using real-user monitoring data.",
  keywords: [
    "TTFB analysis",
    "server diagnostics",
    "connection diagnostics",
    "RUM analytics",
    "backend response time",
    "request queueing",
    "DNS lookup",
    "TCP connection",
    "cache analytics",
    "Core Web Vitals",
    "performance monitoring",
    "real user monitoring",
  ],
  authors: [{ name: "Speedy Site" }],
  robots: "index, follow",

  openGraph: {
    title: "Server & Connection Diagnostics | Speedy Site",
    description:
      "Monitor backend response time, DNS lookup, TCP/TLS overhead, cache effectiveness, and real-world TTFB performance.",
    url: "https://speedy.site/rum/server-connection-diagnostics",
    siteName: "Speedy Site",
    images: [
      {
        url: "/images/homepage/Cache-Efficiency.png",
        width: 1200,
        height: 630,
        alt: "Server and Connection Diagnostics Dashboard",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Server & Connection Diagnostics",
    description:
      "Analyze backend latency, network overhead, cache efficiency, and TTFB using real-user monitoring.",
    images: ["/images/homepage/Cache-Efficiency.png"],
  },
};

export default function NetworkAnalysis() {
  return <Main />;
}
