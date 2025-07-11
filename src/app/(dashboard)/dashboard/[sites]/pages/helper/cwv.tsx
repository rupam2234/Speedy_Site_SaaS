"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import CWVChart from "../charts/cwvChart";

interface CWVProps {
  url: string;
  pageData: any;
}

const MetricTypes = [
  "Largest Contentful Paint (LCP)",
  "Interaction to Next Paint (INP)",
  "Cumulative Layout Shift (CLS)",
  "First Contentful Paint (FCP)",
];

export default function CWV({ pageData }: CWVProps) {
  const [activeMetric, setActiveMetric] = useState<
    | "Largest Contentful Paint (LCP)"
    | "Interaction to Next Paint (INP)"
    | "Cumulative Layout Shift (CLS)"
    | "First Contentful Paint (FCP)"
  >("Largest Contentful Paint (LCP)");

  // function to handle active metric
  function handleActiveMetric(
    key:
      | "Largest Contentful Paint (LCP)"
      | "Interaction to Next Paint (INP)"
      | "Cumulative Layout Shift (CLS)"
      | "First Contentful Paint (FCP)"
  ) {
    setActiveMetric(key);
  }
  return (
    <div className="p-4 h-max">
      <div className="grid md:grid-cols-12 gap-3 grid-cols-1">
        <div className="col-span-1 md:col-span-9 mt-3">
          <CWVChart pageData={pageData} metric_key={activeMetric} />
        </div>
        <div className="col-span-1 md:col-span-3">
          {MetricTypes.map((x: any) => (
            <Button
              onClick={() => handleActiveMetric(x)}
              key={x}
              className={`p-4 cursor-pointer mt-3 shadow-none hover:dark:bg-transparent dark:bg-secondary ${
                activeMetric === x
                  ? "dark:bg-transparent bg-transparent"
                  : "bg-gray-500/10"
              }  hover:bg-transparent text-primary rounded-[2px] min-w-full`}
            >
              {x}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
