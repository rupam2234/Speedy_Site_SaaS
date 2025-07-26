"use client";

import { Protect } from "@clerk/nextjs";
import { useSiteContext } from "../../siteContext";
import { useEffect, useState } from "react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import { PlanValidation } from "@/components/utils/activePlanValidation";
import RumDashboard, { WebVitalsMetric } from "./helpers/dashboard";
import { Radio } from "lucide-react";
import { ExperienceData } from "./helpers/ExperienceBar";

export default function RUM() {
  const { selectedSite } = useSiteContext();
  const [distdata, setDistData] = useState<WebVitalsMetric[]>([]);
  const [happinessData, setHappinessData] = useState<ExperienceData[]>([]);

  useEffect(() => {
    if (selectedSite) {
      GetDistribution();
      GetUserHappiness();
    }
  }, [selectedSite]);

  async function GetDistribution() {
    try {
      const res = await fetch("/api/rum/percentile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: "7days",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDistData(data.metrics || []);
      } else {
        setDistData([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      setDistData([]);
    }
  }

  async function GetUserHappiness() {
    try {
      const res = await fetch("/api/rum/happiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: "7days",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHappinessData(data.metrics || []);
      } else {
        setHappinessData([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      setHappinessData([]);
    }
  }

  PlanValidation(); // redirect to billing if no active plan

  if (distdata.length == 0) {
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
          <>
            <div className="flex flex-col items-start md:flex-row gap-2 md:items-center md:justify-between">
              <span className="flex gap-2 items-center">
                <Radio
                  size={30}
                  className="fill-pink-600 text-primary/70 dark:text-accent/70"
                />
                <h2 className="text-md md:text-2xl font-bold text-primary/90">
                  RUM Dashboard
                </h2>
              </span>
              <span className="flex gap-3 item-center cursor-help text-accent-foreground/80 dark:text-accent-foreground font-semibold">
                <div className="relative flex items-center justify-center mt-1 w-4 h-4">
                  {/* Pulsing effect */}
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                  {/* Solid green dot */}
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
                <p>Live Data</p>
              </span>
            </div>
            <RumDashboard
              distData={distdata}
              experienceBarData={happinessData}
            />
          </>
        ) : (
          <p className="text-center text-gray-500">No site selected.</p>
        )}
      </div>
    </Protect>
  );
}
