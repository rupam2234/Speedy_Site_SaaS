import { Metadata, Viewport } from "next";
import HomepageComponent from "./(home)/homepage";

export const viewport: Viewport = {
  themeColor: "#22c55e",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://speedy.site"),

  title: {
    default: "Speedy Site – Website Performance & UX Monitoring",
    template: "%s | Speedy Site",
  },
  description:
    "Monitor and optimize your website's speed, performance, and user experience. Track key metrics, identify bottlenecks, and improve site performance effortlessly.",

  keywords: [
    "website performance",
    "site speed optimization",
    "user experience monitoring",
    "web performance tools",
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
    title: "Speedy Site – Website Performance & UX Monitoring",
    description:
      "Get actionable insights to fix bottlenecks and improve site speed.",
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
    title: "Speedy Site – Website Performance & UX Monitoring",
    description:
      "Optimize your website's speed and user experience with Speedy Site.",
    images: ["/images/social/speedy-site-banner.png"],
    site: "@SpeedySite",
    creator: "@SpeedySite",
  },
};

export default function Home() {
  return <HomepageComponent />;
}
