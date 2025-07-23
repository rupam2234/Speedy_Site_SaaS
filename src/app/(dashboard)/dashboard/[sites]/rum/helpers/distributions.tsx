import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import React from "react";

interface WebVitalsBarProps {
  metricName: string;
  goodPercent: number;
  needsImprovementPercent: number;
  poorPercent: number;
  minValue: number;
  maxValue: number;
  percentileValue?: number;
  percentileLabel?: string;
}

const WebVitalsBar: React.FC<WebVitalsBarProps> = ({
  goodPercent,
  needsImprovementPercent,
  poorPercent,
  minValue,
  maxValue,
  percentileValue,
  percentileLabel = "p75",
}) => {
  const total = goodPercent + needsImprovementPercent + poorPercent;

  const normalized =
    total !== 100 && total > 0
      ? {
          good: (goodPercent / total) * 100,
          okay: (needsImprovementPercent / total) * 100,
          bad: (poorPercent / total) * 100,
        }
      : {
          good: goodPercent,
          okay: needsImprovementPercent,
          bad: poorPercent,
        };

  const sections = [
    {
      label: "Good",
      value: goodPercent,
      width: normalized.good,
      color: "#66cc8f",
    },
    {
      label: "Needs Improvement",
      value: needsImprovementPercent,
      width: normalized.okay,
      color: "#FFEEA9",
    },
    {
      label: "Poor",
      value: poorPercent,
      width: normalized.bad,
      color: "#FF9898",
    },
  ];

  // Calculate marker position (as % from left) only if valid
  const markerLeftPercent =
    typeof percentileValue === "number" &&
    maxValue > minValue &&
    percentileValue >= minValue &&
    percentileValue <= maxValue
      ? ((percentileValue - minValue) / (maxValue - minValue)) * 100
      : null;

  return (
    <div className="w-full mt-3 h-4 relative flex overflow-visible bg-neutral-200 rounded">
      {/* Colored segments */}
      {sections.map((section, index) => (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            <div
              className="h-full group relative transition-all duration-200 ease-in-out cursor-help"
              style={{ width: `${section.width}%` }}
            >
              <div
                className="h-full w-full transition-transform duration-200 ease-in-out group-hover:scale-y-[1.10] group-hover:shadow-md rounded"
                style={{ backgroundColor: section.color }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>
              {section.value.toFixed(1)}% of users had a {section.label}{" "}
              experience
            </span>
          </TooltipContent>
        </Tooltip>
      ))}

      {/* Optional percentile marker */}
      {markerLeftPercent !== null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute top-[-2px] bottom-[-2px] w-[2px] bg-black/70"
              style={{ left: `${markerLeftPercent}%` }}
            />
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>
              {percentileLabel}: {percentileValue}
            </span>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

export default WebVitalsBar;
