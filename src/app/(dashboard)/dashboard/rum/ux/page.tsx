import { Metadata } from "next";
import { UxReport } from ".";

export const metadata: Metadata = {
  title: "User Experience Distributions | Speedy Site",
  description:
    "Representation of the weekly p75 user experience for the active website across global regions, weighted by traffic distribution.",
};

export default function UXHeatmap() {
  return (
    <div className="relative p-5">
      <UxReport />
    </div>
  );
}
