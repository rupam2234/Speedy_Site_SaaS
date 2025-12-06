"use client";

import TooltipIcon from "@/components/utils/customTooltip";

interface INPelementProps {
  contributors: any;
}

export default function INPelements({ contributors }: INPelementProps) {
  return (
    <div className="divide-y divide-gray-200 dark:divide-primary/5">
      <div className="flex items-center justify-between">
        <p>Elements</p>
      </div>
      {contributors.map((x: any, i: number) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="w-3/4">
            <p className="text-sm font-medium text-primary/80">
              {String(x.affected_element ?? "—")}
            </p>

            <div className="flex text-[12px] items-center gap-2">
              {/* <p>Interection type: {x.interaction_type ?? "—"}</p> */}
              <p className="text-xs text-gray-500">
                Occured: {x.occurrence_count ?? "—"}
              </p>
            </div>
          </div>

          <div className="text-[12px] flex items-center gap-2 font-semibold text-right">
            <TooltipIcon
              content={"Average INP"}
              side="left"
              trigger={
                <span className="bg-orange-400 text-primary-foreground dark:text-primary px-2 py-1 shadow-2xl">
                  Avg INP:{" "}
                  {x.avg_inp_value ? `${x.avg_inp_value.toFixed(0)}` : "—"}
                </span>
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
