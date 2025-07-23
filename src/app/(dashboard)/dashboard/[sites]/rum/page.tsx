"use client";

import { Protect } from "@clerk/nextjs";
import { useSiteContext } from "../../siteContext";
import { useEffect, useState } from "react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import { PlanValidation } from "@/components/utils/activePlanValidation";
import RumDashboard from "./helpers/dashboard";

export default function RUM() {
  const { selectedSite } = useSiteContext();
  const [showPrompt, setShowPrompt] = useState(false);

  PlanValidation(); // redirect to billing if no active plan

  useEffect(() => {
    if (!selectedSite) {
      const timeout = setTimeout(() => {
        setShowPrompt(true);
      }, 4000);

      return () => clearTimeout(timeout);
    } else {
      setShowPrompt(true);
    }
  }, [selectedSite]);

  if (!showPrompt) {
    return (
      <div className="flex items-center justify-center md:mt-[-100px] min-h-full">
        <LoadingAnimation />
      </div>
    );
  }

  function fallback() {
    return (
      <div className="flex flex-col items-center justify-center md:mt-[-150px] min-h-screen p-6">
        <span className="text-4xl mb-4">🔒</span>
        <h2 className="text-[16px] font-normal text-center text-primary">
          You need at least the pro plan to view real user monitoring report.
        </h2>
        <p>
          Please visit <strong>account</strong> {">"} <strong>billing</strong>{" "}
          to check your active plan.
        </p>
      </div>
    );
  }

  return (
    <Protect plan="pro" fallback={fallback()}>
      <div className="m-5">
        {selectedSite ? (
          <RumDashboard />
        ) : (
          <p className="text-center text-gray-500">No site selected.</p>
        )}
      </div>
    </Protect>
  );
}
