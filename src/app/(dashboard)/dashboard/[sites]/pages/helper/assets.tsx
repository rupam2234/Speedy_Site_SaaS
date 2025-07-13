"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import AssetChart from "../charts/assetChart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import RequestsChart from "../charts/requestChart";

interface PageAssetProps {
  pageData: any;
}

const AssetType = [
  {
    key: "Content Size",
    tooltip: "Total data size loaded and decoded to render the page.",
  },
  {
    key: "Transfer Size",
    tooltip:
      "Amount of data transferred over the network to load the page, usually compressed.",
  },
  {
    key: "Requests Count",
    tooltip:
      "Number of times a browser asks the server for files (HTML, images, CSS, scripts, etc) to load your page.",
  },
];

export default function PageAssets({ pageData }: PageAssetProps) {
  const [activeAsset, setActiveAsset] = useState<
    "Content Size" | "Transfer Size" | "Requests Count"
  >("Content Size");

  // to handle active asset
  function handleActiveAsset(
    key: "Content Size" | "Transfer Size" | "Requests Count"
  ) {
    setActiveAsset(key);
  }

  return (
    <div className="p-4 h-max">
      <div className="grid md:grid-cols-12 gap-3 grid-cols-1">
        <div className="col-span-1 md:col-span-9 mt-3">
          {activeAsset === "Requests Count" ? (
            <RequestsChart pageData={pageData} />
          ) : (
            <AssetChart pageData={pageData} assetKey={activeAsset} />
          )}
        </div>
        <div className="col-span-1 md:col-span-3">
          {AssetType.map((x: any) => (
            <Tooltip key={x.key}>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleActiveAsset(x.key)}
                  className={`p-4 cursor-pointer mt-3 shadow-none hover:dark:bg-transparent dark:bg-secondary ${
                    activeAsset === x.key
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
