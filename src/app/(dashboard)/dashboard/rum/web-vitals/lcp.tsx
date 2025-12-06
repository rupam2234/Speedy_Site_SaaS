"use client";

import TooltipIcon from "@/components/utils/customTooltip";
import { Code2, FileQuestion, Image, ImageOff } from "lucide-react";
import Link from "next/link";

interface LCPelementProps {
  contributors: any;
}

export default function LCPelements({ contributors }: LCPelementProps) {
  console.log(contributors);

  return (
    <div className="divide-y divide-gray-200 dark:divide-primary/5">
      <p className="font-semibold text-sm">Major Contributors</p>
      {contributors.map((x: any, i: number) => {
        const type = classifyElement(x);

        return (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="flex items-start gap-2">
              <div className="mt-1 text-primary/40">
                {type === "image" ? (
                  <Image size={16} />
                ) : type === "text" ? (
                  <p className="font-black w-4">T</p>
                ) : type === "div" ? (
                  <Code2 size={16} />
                ) : type === "background-image" ? (
                  <ImageOff size={16} />
                ) : type === "other" ? (
                  <FileQuestion size={16} />
                ) : (
                  <div className="bg-primary/5 rounded-sm w-4 h-4"></div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-primary/80">
                  {x.element_target}
                </p>
                <p className="text-xs text-gray-500">
                  {x.page_url.replace(/\/$/, "") ?? "—"}
                </p>
                {type === "image" || type === "background-image" ? (
                  <p className="text-[12px] text-primary/60">
                    <span className="font-semibold">Image address:</span>{" "}
                    <Link
                      className="underline hover:underline-none decoration-dotted underline-offset-2 cursor-pointer"
                      href={x.image_url}
                      target="_blank"
                      rel="nofollow"
                    >
                      {x.image_url.length > 50
                        ? x.image_url.slice(0, 50) + "…"
                        : x.image_url}
                    </Link>
                  </p>
                ) : (
                  <></>
                )}
                {x.poor_count && (
                  <p className="text-primary/60 text-[12px]">
                    Captured {x.poor_count} times
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium">
              {(() => {
                const s = getTimingStatus(x.avg_resource_load_delay);
                return (
                  <TooltipIcon
                    content={`Element load delay: ${s.label}`}
                    side="left"
                    trigger={
                      <div className="flex items-center gap-1 px-2 py-[3px] rounded-md border border-blue-300/40 bg-blue-100/40 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                        ⏳
                        {x.avg_resource_load_delay
                          ? `${(x.avg_resource_load_delay / 1000).toFixed(2)}s`
                          : "—"}
                      </div>
                    }
                  />
                );
              })()}

              {(() => {
                const s = getTimingStatus(x.avg_resource_load_duration);
                return (
                  <TooltipIcon
                    content={`Resource load duration: ${s.label}`}
                    side="left"
                    trigger={
                      <div className="flex items-center gap-1 px-2 py-[3px] rounded-md border border-purple-300/40 bg-purple-100/40 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300">
                        ⚡
                        {x.avg_resource_load_duration
                          ? `${(x.avg_resource_load_duration / 1000).toFixed(2)}s`
                          : "—"}
                      </div>
                    }
                  />
                );
              })()}

              {(() => {
                const s = getTimingStatus(x.avg_element_render_delay);
                return (
                  <TooltipIcon
                    content={`Element render delay: ${s.label}`}
                    side="left"
                    trigger={
                      <div className="flex items-center gap-1 px-2 py-[3px] rounded-md border border-orange-300/40 bg-orange-100/40 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">
                        🎨
                        {x.avg_element_render_delay
                          ? `${(x.avg_element_render_delay / 1000).toFixed(2)}s`
                          : "—"}
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
    const selector = item.element_target;

    if (
      selector.includes("img") ||
      selector.includes("wp-block-image") ||
      selector.includes("figure")
    )
      return "image";

    if (!selector.includes("img") && item.image_url) {
      return "background-image";
    }

    if (
      selector.includes("h1") ||
      selector.includes("h2") ||
      selector.includes("h3") ||
      selector.includes("p") ||
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

    if (v < 200) return { label: "Good", status: "good" };
    if (v < 600) return { label: "Needs improvement", status: "ni" };
    return { label: "Poor", status: "poor" };
  }
}
