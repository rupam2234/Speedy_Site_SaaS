"use client";

import { Inter, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "../(home)";
import { ImageOptimizer } from ".";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function Main() {
  return (
    <div className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <SiteHeader enableNav={false} />
      <ImageOptimizer />
    </div>
  );
}
