"use client";

import TooltipIcon from "@/components/utils/customTooltip";

interface CLSelementProps {
  contributors: any;
}

export default function CLSelements({ contributors }: CLSelementProps) {
  return (
    <div className="divide-y divide-gray-200 dark:divide-primary/5">
      <div className="flex items-center justify-between">
        <p>Elements</p>
      </div>
      {contributors.map((x: any, i: number) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="w-3/4">
            <p className="text-sm font-medium text-primary/80">
              {x.affected_component}
            </p>
            <p className="text-xs text-gray-500">
              Occured: {x.occurrence_count ?? "—"}
            </p>
          </div>

          <div className="text-[12px] flex items-center gap-2 font-semibold text-right">
            <TooltipIcon
              content={"Average CLS"}
              side="left"
              trigger={
                <span className="bg-orange-400 text-primary-foreground dark:text-primary px-2 py-1 shadow-2xl">
                  Avg CLS:{" "}
                  {x.avg_cls_value ? `${x.avg_cls_value.toFixed(2)}` : "—"}
                </span>
              }
            />
            <TooltipIcon
              content={"Max CLS"}
              side="left"
              trigger={
                <span className="bg-red-400/80 text-primary-foreground dark:text-primary px-2 py-1 shadow-2xl">
                  Max CLS:{" "}
                  {x.max_cls_value ? `${x.max_cls_value.toFixed(2)}` : "—"}
                </span>
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
