"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useSiteContext } from "@/app/(dashboard)/siteContext";
import TimingPieChart from "../charts/docTimingChart";
import LCPPieChart from "../charts/lcpTimingChart";

interface TimingProps {
  pageData: any;
}

const TimingType = [
  {
    key: "Document Timing",
    tooltip: "Breaks down the latest timing main document takes to load",
  },
  {
    key: "LCP Timing",
    tooltip: "Help your discover LCP element timing breakdown & their types",
  },
];

export default function Timings({ pageData }: TimingProps) {
  const [activeModule, setActiveModule] = useState<
    "Document Timing" | "LCP Timing"
  >("Document Timing");
  const { selectedDevice } = useSiteContext();

  function handleActiveAsset(key: "Document Timing" | "LCP Timing") {
    setActiveModule(key);
  }

  useEffect(() => {
    console.log(pageData);
  }, [pageData, selectedDevice]);

  return (
    <div className="p-4 h-max">
      <div className="grid md:grid-cols-12 gap-3 grid-cols-1">
        <div className="col-span-1 md:col-span-9 mt-3">
          {activeModule === "Document Timing" ? (
            <TimingPieChart pageData={pageData} activeModule={activeModule} />
          ) : activeModule === "LCP Timing" ? (
            <LCPPieChart pageData={pageData} activeModule={activeModule} />
          ) : (
            <></>
          )}
        </div>
        <div className="col-span-1 md:col-span-3">
          {TimingType.map((x: any) => (
            <Tooltip key={x.key}>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleActiveAsset(x.key)}
                  className={`p-4 cursor-pointer mt-3 shadow-none hover:dark:bg-transparent dark:bg-secondary ${
                    activeModule === x.key
                      ? "dark:bg-transparent bg-transparent"
                      : "bg-gray-500/10"
                  }  hover:bg-transparent text-primary rounded-[2px] min-w-full`}
                >
                  {x.key}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{x.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}
