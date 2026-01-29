import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

interface SegmentedBarProps {
  good: number;
  okay: number;
  bad: number;
  p75?: number;
}

const SegmentedBar: React.FC<SegmentedBarProps> = ({ good, okay, bad }) => {
  const total = good + okay + bad;
  const normalized =
    total !== 100 && total > 0
      ? {
          good: (good / total) * 100,
          okay: (okay / total) * 100,
          bad: (bad / total) * 100,
        }
      : { good, okay, bad };

  const sections = [
    { label: "good", value: good, width: normalized.good, color: "#66cc8f" },
    { label: "okay", value: okay, width: normalized.okay, color: "#FFEEA9" },
    { label: "poor", value: bad, width: normalized.bad, color: "#FF9898" },
  ];

  return (
    <div className="w-full mt-4 h-7 relative flex overflow-visible bg-transparent">
      {sections.map((section, index) => (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            <div
              className="h-full group relative transition-all duration-200 ease-in-out cursor-help"
              style={{ width: `${section.width}%` }}
            >
              <div
                className="h-full w-full transition-transform duration-200 ease-in-out group-hover:scale-y-[1.10] group-hover:shadow-md"
                style={{ backgroundColor: section.color }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-primary/90 rounded-sm">
            <span>
              {section.value === undefined ? (
                <></>
              ) : (
                <>
                  {(section.value * 100).toFixed(2)}% users had {section.label}{" "}
                  experience
                </>
              )}
            </span>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export default React.memo(SegmentedBar);
