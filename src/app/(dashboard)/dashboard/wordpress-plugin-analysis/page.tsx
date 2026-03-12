import { Metadata } from "next";
import { Main } from ".";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "WordPress Plugin Analysis | Speedy Site",
  description:
    "Analyze your WordPress plugins to detect performance issues, conflicts, and security risks. Speedy Site helps you optimize plugins for faster and more reliable websites.",
};

export default function WPpluginAnalysis() {
  return (
    <Suspense fallback={<></>}>
      <div className="p-5">
        <Main />
      </div>
    </Suspense>
  );
}
