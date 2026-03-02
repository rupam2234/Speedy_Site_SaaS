import { Metadata } from "next";
import HomepageComponent from "./(home)/homepage";

export const metadata: Metadata = {
  title: "Speedy Site – Website Performance & User Experience Monitoring",
  description:
    "Monitor and optimize your website's speed, performance, and user experience with Speedy Site. Track key metrics, identify bottlenecks, and improve site performance effortlessly.",
  keywords: [
    "website performance",
    "site speed optimization",
    "user experience monitoring",
    "performance metrics",
    "website analytics",
    "web performance tools",
    "Speedy Site",
  ],
  authors: [{ name: "Speedy Site Team" }],
  viewport: "width=device-width, initial-scale=1.0",
  robots: "index, follow",
  openGraph: {
    title: "Speedy Site – Website Performance & UX Monitoring",
    description:
      "Track and optimize your website’s performance and user experience with Speedy Site. Get actionable insights to fix bottlenecks and improve site speed.",
    type: "website",
    url: "https://speedysite.com",
    images: "/images/social/Speedy.site banner.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "Speedy Site – Website Performance & UX Monitoring",
    description:
      "Optimize your website's speed and user experience with Speedy Site. Monitor performance metrics and resolve issues quickly.",
    images: "/images/social/Speedy.site banner.png",
    site: "@SpeedySite",
  },
};

export default function Home() {
  return <HomepageComponent />;
}
