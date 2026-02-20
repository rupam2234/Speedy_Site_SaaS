import { Metadata } from "next";
import WPOptimizationService from "./main";

export const metadata: Metadata = {
  title: "WordPress Optimization Service | Speedy Site",
  description:
    "a WordPress Optimization Service backed by integrated Real User Monitoring system.",
  keywords: [
    "Speedy Site",
    "WordPress optimization",
    "RUM",
    "Real User Monitoring",
    "Website performance",
    "WordPress speed",
  ],
  authors: [{ name: "Speedy Site Team" }],
  creator: "Speedy Site",
  openGraph: {
    title: "WordPress Optimization Service | Speedy Site",
    description:
      "a WordPress Optimization Service backed by integrated Real User Monitoring system.",
    url: "https://speedy.site",
    siteName: "Speedy Site",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact | Speedy Site",
    description:
      "Get in touch with Speedy Site for RUM and WordPress optimization services to improve your site speed and user experience.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function WPoptimization() {
  return <WPOptimizationService />;
}
