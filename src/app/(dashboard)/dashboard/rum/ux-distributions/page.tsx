import { Metadata } from "next";
import { UxReport } from ".";

export const metadata: Metadata = {
  title: "Speedy Site | User Experience Distributions",
  description: "Find out user experience accross geographical regions",
};

export default function UXHeatmap() {
  return (
    <div className="relative p-5">
      <UxReport />
    </div>
  );
}
