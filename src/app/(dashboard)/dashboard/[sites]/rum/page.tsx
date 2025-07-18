"use client";

import { Protect, useAuth } from "@clerk/nextjs";
import { useSiteContext } from "../../siteContext";
import { useEffect, useState } from "react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import { PlanValidation } from "@/components/utils/activePlanValidation";

export default function RUM() {
  const { selectedSite } = useSiteContext();
  const [showPrompt, setShowPrompt] = useState(false);

  const { userId } = useAuth();

  // console.log(userId);

  // const clerk = useClerk();

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
      <div className="flex min-h-full md:mt-[-180px] items-center justify-center text-muted-foreground">
        <LoadingAnimation />
      </div>
    );
  }

  function fallback() {
    return (
      <div className="flex flex-col items-center justify-center md:mt-[-150px] min-h-screen p-6">
        <span className="text-4xl mb-4">🔒</span>
        <h2 className="text-[16px] font-normal text-center text-primary">
          You need the pro plan to access real user monitoring.
        </h2>
      </div>
    );
  }

  return (
    <Protect plan="pro" fallback={fallback()}>
      <div className="m-5">Rum dashboard</div>
    </Protect>
  );
}
