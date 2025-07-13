"use client";

import { pageMetricCache } from "@/components/globalData/cachedPageData";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings2 } from "lucide-react";

export default function Settings() {
  const clearCache = pageMetricCache((state) => state.reset);

  function handleCache() {
    clearCache(); // clear page cache
  }

  return (
    <div className="m-5 border rounded-sm p-4 bg-primary-foreground dark:bg-secondary-background">
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
              Clear Cache
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            Use this to flush the page cache after adding pages for immediate
            updates.
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 my-5">
        <div className="col-span-1 md:col-span-6">Domain settings</div>
        <div className="col-span-1 md:col-span-6">Quota View</div>
      </div>
    </div>
  );
}
