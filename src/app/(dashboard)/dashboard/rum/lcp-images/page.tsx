import { Metadata } from "next";
import { Main } from ".";

export const metadata: Metadata = {
  title: "Images | Speedy Site",
  description:
    "Identify the images that have the greatest impact on your website's LCP.",
};

export default function LcpImages() {
  return <Main />;
}
