"use client";

import TooltipIcon from "@/components/utils/customTooltip";
import { Code2, FileQuestion, Image, ImageOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface LCPelementProps {
  contributors: any;
}

export default function LCPelements({ contributors }: LCPelementProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  const totalpages = contributors
    ? Math.ceil(contributors.length / itemsPerPage)
    : 0;

  let activeItems;

  function prevPage() {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }

  function nextPage() {
    setCurrentPage((prev) => Math.min(prev + 1, totalpages));
  }

  activeItems = contributors.slice(
    (currentPage - 1) * itemsPerPage,
    itemsPerPage * currentPage,
  );

  return (
    <div className="divide-y divide-gray-200 dark:divide-primary/5">
      <div className="flex justify-between pb-2 items-center mb-3">
        <p className="font-semibold text-sm">Contributing Elements</p>
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="itemsPerPage">Items per page:</label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-[2px] text-sm outline-0 cursor-pointer"
            >
              {[3, 5, 10, 20].map((n) => (
                <option
                  className="dark:text-primary dark:bg-secondary-background/80"
                  key={n}
                  value={n}
                >
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={prevPage}
              className="px-2 dark:text-white bg-primary/20 hover:bg-primary/40 text-primary-foreground cursor-pointer rounded-[2px] text-sm"
            >
              Prev
            </button>
            <span className="text-sm">
              {currentPage} of {totalpages} pages
            </span>
            <button
              onClick={nextPage}
              className="px-2 dark:text-white bg-primary/20 hover:bg-primary/40 text-primary-foreground cursor-pointer rounded-[2px] text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {activeItems?.map((x: any, i: number) => {
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
                  {x.page_url.includes("fbclid") ? (
                    <span className="truncate block md:w-2/5 w-56">
                      {x.page_url}
                    </span>
                  ) : (
                    (x.page_url.replace(/\/$/, "") ?? "—")
                  )}
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
                {x.poor_count ? (
                  <p className="text-primary/60 text-[12px]">
                    Captured {x.poor_count} times
                  </p>
                ) : (
                  <p></p>
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
                      <div
                        className={`flex items-center gap-1 px-2 py-[3px] rounded-md border ${getPillDesign(s.status)}`}
                      >
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
                      <div
                        className={`flex items-center gap-1 px-2 py-[3px] rounded-md border ${getPillDesign(s.status)}`}
                      >
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
                      <div
                        className={`flex items-center gap-1 px-2 py-[3px] rounded-md border ${getPillDesign(s.status)}`}
                      >
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
