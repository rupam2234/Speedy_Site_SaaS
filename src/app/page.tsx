import { Metadata, Viewport } from "next";
import HomepageComponent from "./(home)/homepage";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://speedy.site"),

  title: {
    default:
      "Speedy Site – WordPress Performance Optimization Powered by Real User Data",
    template: "%s",
  },
  description:
    "Speedy Site is a managed WordPress performance optimization service. Connect your site once: we validate it, collect real user data, and our experts fix the performance issues that actually matter.",

  keywords: [
    "wordpress performance optimization",
    "wordpress speed optimization",
    "real user monitoring",
    "core web vitals",
    "managed wordpress performance service",
    "Speedy Site",
  ],
  authors: [{ name: "Speedy Site Team" }],

  robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title:
      "Speedy Site – WordPress Performance Optimization Powered by Real User Data",
    description:
      "Connect your site once: we validate it and collect real user data. Our experts fix the WordPress performance issues that actually matter.",
    type: "website",
    url: "/",
    siteName: "Speedy Site",
    locale: "en_US",
    images: [
      {
        url: "/images/social/speedy-site-banner.png",
        width: 1200,
        height: 630,
        alt: "Speedy Site Dashboard Preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title:
      "Speedy Site – WordPress Performance Optimization Powered by Real User Data",
    description:
      "Connect once. Real user data. Real WordPress performance fixes.",
    images: ["/images/social/speedy-site-banner.png"],
    site: "@SpeedySite",
    creator: "@SpeedySite",
  },
};

export default function Home() {
  return <HomepageComponent />;
}
