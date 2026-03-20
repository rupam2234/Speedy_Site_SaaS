import { Metadata } from "next";
import Main from "./main";

export const metadata: Metadata = {
  title: "Font Bottleneck Diagnostics | Speedy Site",
  description:
    "Discover which fonts are slowing down your site. Track 'Flash of Invisible Text' (FOIT) issues and optimize font delivery for better Core Web Vitals.",
};

export default function Fonts() {
  return <Main />;
}
