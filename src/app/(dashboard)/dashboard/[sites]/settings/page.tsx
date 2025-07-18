"use client";

import { pageMetricCache } from "@/components/globalData/cachedPageData";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlanValidation } from "@/components/utils/activePlanValidation";
import { Settings2 } from "lucide-react";
import React from "react";

// Replace with real hook or prop
const useUserPagesWithRunCounts = () => {
  return [
    { id: "1", url: "https://example.com/home", runsThisMonth: 120 },
    { id: "2", url: "https://example.com/about", runsThisMonth: 180 },
    { id: "3", url: "https://example.com/contact", runsThisMonth: 75 },
  ];
};

export default function Settings() {
  const clearCache = pageMetricCache((state) => state.reset);
  const pages = useUserPagesWithRunCounts(); // replace with actual data

  const totalQuota = 1800;
  const totalUsage = pages.reduce((sum, p) => sum + p.runsThisMonth, 0);
  const totalRemaining = totalQuota - totalUsage;
  const totalUsedPercent = Math.min((totalUsage / totalQuota) * 100, 100);

  function handleCache() {
    clearCache(); // clear page cache
  }

  PlanValidation(); // redirect to billing if no active plan

  return (
    <div className="m-5 border rounded-sm p-4 bg-primary-foreground dark:bg-secondary-background">
      {/* Header */}
      <div className="border-b flex gap-2 justify-between items-center">
        <span className="flex gap-2 items-center">
          <Settings2 />
          <h2 className="my-3 font-bold text-2xl">Domain Settings</h2>
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleCache}
              className="cursor-pointer px-2 py-1 rounded-sm text-sm hover:bg-[#FF9898] dark:hover:bg-[#FF9898]"
            >
              Update Quota
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            Use this to flush the page cache after adding pages for immediate
            updates.
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 my-5">
        <div className="col-span-1 md:col-span-6">
          <h3 className="font-semibold text-lg mb-2">Domain Settings</h3>
          <p className="text-muted-foreground">
            Manage domain-related configurations.
          </p>
        </div>

        {/* Quota View */}
        <div className="col-span-1 md:col-span-6 border-2 p-4 rounded-sm">
          <h3 className="font-semibold text-lg mb-2">Lab Credit</h3>

          {/* ✅ Total Quota Summary Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center text-sm mb-1 font-medium">
              <span>
                Total Usage: {totalUsage} / {totalQuota}
              </span>
              <span className="text-[#55b943]">
                Remaining: {totalRemaining}
              </span>
            </div>
            <div className="w-full mt-2 bg-gray-200 dark:bg-gray-700 rounded h-4">
              <div
                className="h-4 rounded bg-[#55b943]"
                style={{ width: `${totalUsedPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
