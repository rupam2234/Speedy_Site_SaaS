import { Main } from ".";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpeedyPixel - Convert Images for Faster Websites",
  description:
    "SpeedyPixel helps you convert and optimize images to improve website performance and boost Core Web Vitals like LCP.",
  keywords: [
    "image converter",
    "image optimization",
    "web performance",
    "LCP optimization",
    "Core Web Vitals",
    "SpeedyPixel",
  ],
  openGraph: {
    title: "SpeedyPixel - Image Optimization Tool",
    description:
      "Convert and optimize images instantly to improve your website speed and Core Web Vitals.",
    url: "https://speedy.site/pixel",
    siteName: "SpeedyPixel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpeedyPixel - Image Optimization Tool",
    images: [
      {
        url: "/images/speedy-pixel/Speedy-pixel-banner-optimized.png",
        width: 1200,
        height: 630,
        alt: "Speedy Pixel Dashboard Preview",
      },
    ],
    description:
      "Boost your website speed by converting and optimizing images instantly.",
  },
};

export default function SpeedyPixel() {
  return <Main />;
}
