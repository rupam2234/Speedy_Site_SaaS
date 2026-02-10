import { Metadata } from "next";
import { Main } from ".";

export const metadata: Metadata = {
  title: "Speedy Site | Cloudflare Enhancements",
  description:
    "Cloudflare enhancements improve caching efficiency and allow you to apply custom cache rules for better performance.",
};

export default function CloudflareEnhancements() {
  return <Main />;
}
