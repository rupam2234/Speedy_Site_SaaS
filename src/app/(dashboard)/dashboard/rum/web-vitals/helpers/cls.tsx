"use client";

import TooltipIcon from "@/components/theme/customTooltip";
import { Code2, File, Megaphone } from "lucide-react";
import Link from "next/link";

interface LCPelementProps {
  contributors: any;
  selectedSite: string;
}

export default function CLSelements({
  contributors,
  selectedSite,
}: LCPelementProps) {
  return (
    <div className="divide-y divide-gray-200 dark:divide-primary/5">
      <p className="font-semibold text-sm">Major Contributors</p>
      {contributors?.map((x: any, i: number) => {
        const type = classifyElement(x);

        return (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="flex items-start gap-2">
              <div className="mt-1 text-primary/40">
                {type === "advertisement" ? (
                  <Megaphone size={16} />
                ) : type === "text" ? (
                  <p className="font-black w-4">T</p>
                ) : type === "div" ? (
                  <Code2 size={16} />
                ) : type === "other" ? (
                  <File size={16} />
                ) : (
                  <div className="bg-primary/5 rounded-sm w-4 h-4"></div>
                )}
              </div>
              <div className="max-w-3xl">
                <p className="text-sm font-medium max-w-3xl text-primary/80">
                  {x.largest_shift_target}
                </p>
                <div className="text-xs text-primary/80">
                  Page:{" "}
                  <Link
                    href={`https://${selectedSite}${x.current_page}`}
                    className="hover:text-primary/40 truncate"
                    rel="nofollow"
                    target="_blank"
                  >
                    {`https://${selectedSite}`}
                    {x.current_page.includes("fbclid") ? (
                      <span className="truncate block md:w-2/5 w-56">
                        {}
                        {x.current_page}
                      </span>
                    ) : (
                      (x.current_page.replace(/\/$/, "") ?? "—")
                    )}
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium">
              {(() => {
                const s = getTimingStatus(x.cls_value);
                return (
                  <TooltipIcon
                    content={`Cumulative layout Shift: ${s.label}`}
                    side="left"
                    trigger={
                      <div
                        className={`flex items-center gap-1 px-2 py-0.75 rounded-md border ${getPillDesign(s.status)}`}
                      >
                        ⏳{x.cls_value ? `${x.cls_value.toFixed(4)}` : "—"}
                      </div>
                    }
                  />
                );
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );

  function classifyElement(item: any) {
    const selector = item.largest_shift_target;

    if (selector.includes("ad") && !selector.includes("section"))
      return "advertisement";

    if (
      selector.includes("h1") ||
      selector.includes("h2") ||
      selector.includes("h3") ||
      selector.split(">").pop().trim() === "p" ||
      selector.includes("span") ||
      selector.includes("text")
    ) {
      return "text";
    }

    if (selector.includes("div")) {
      return "div";
    }

    return "other";
  }

  function getTimingStatus(value: number | null | undefined) {
    if (!value || value <= 0) return { label: "No data", status: "none" };

    const v = value;

    if (v < 0.1) return { label: "Good", status: "good" };
    if (v < 0.25) return { label: "Needs improvement", status: "ni" };
    return { label: "Poor", status: "poor" };
  }

  function getPillDesign(status: string) {
    if (status === "none")
      return "border-gray-300/40 bg-gray-100/40 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300";
    else if (status === "good")
      return "border-green-300/40 bg-green-100/40 dark:bg-green-500/20 text-green-700 dark:text-green-300";
    else if (status === "ni")
      return "border-yellow-300/40 bg-yellow-100/40 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
    else if (status === "poor")
      return "border-red-300/40 bg-red-100/40 dark:bg-red-500/20 text-red-700 dark:text-red-300";
  }
}
