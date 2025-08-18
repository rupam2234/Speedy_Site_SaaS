"use client";

import { useEffect, useState } from "react";
import { useSiteContext } from "./siteContext";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
// import { PlanValidation } from "@/components/utils/activePlanValidation";
import WebsitePage from "./helpers/main";

export default function Dashboard() {
  const { selectedSite } = useSiteContext();
  const [showPrompt, setShowPrompt] = useState(false);

  // PlanValidation(); // redirect to billing if no active plan

  // Wait for 8 seconds before showing "Select a website" message
  useEffect(() => {
    if (!selectedSite) {
      const timeout = setTimeout(() => {
        setShowPrompt(true);
      }, 4000);

      return () => clearTimeout(timeout);
    }
  }, [selectedSite]);

  // Render logic
  if (!selectedSite && !showPrompt) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  if (!selectedSite && showPrompt) {
    return (
      <div className="flex flex-col space-y-4 md:mt-[-50px] items-center justify-center min-h-full dark:text-secondary-background p-8">
        <p className="text-4xl md:text-6xl font-bold text-primary/50">
          Website 404
        </p>
        <p className="text-center text-muted-foreground w-full">
          We couldn&apos;t find the website you&apos;re looking for.
          <br />
          To get started, try{" "}
          <span className="font-medium text-foreground">
            adding a new site
          </span>{" "}
          using the left sidebar.
        </p>
      </div>
    );
  }

  return <WebsitePage />;
}
