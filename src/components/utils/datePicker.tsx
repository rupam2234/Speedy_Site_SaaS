"use client";

import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";

type Props = {
  /**
   * Pass default date range (in days): example: 72, 500
   */
  defaultDateRange?: number;
};

export default function CustomCalendar({ defaultDateRange }: Props) {
  const baseDate = new Date();

  // if we have default date range: use it
  if (defaultDateRange) {
    baseDate.setDate(baseDate.getDate() - defaultDateRange);
  } else {
    // else default to 30 days
    baseDate.setDate(baseDate.getDate() - 30);
  }

  const { setStartDate, setEndDate } = useSiteContext();
  const [open, setOpen] = useState(false);

  /**
   * Using `mode="multiple"` → selected is Date[]
   * index 0 = start
   * index 1 = end
   */
  const [dates, setDates] = useState<Date[]>([baseDate, new Date()]);

  // sync with context
  useEffect(() => {
    if (!dates.length) return;

    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());

    setStartDate(sorted[0]);
    setEndDate(sorted[1] ?? sorted[0]);
  }, [dates, setStartDate, setEndDate]);

  const start = dates[0];
  const end = dates[1];

  return (
    <div className="relative w-full max-w-[300px]">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full cursor-pointer rounded-md px-3 py-2
          flex justify-between items-center text-sm
          dark:bg-secondary-background bg-gray-500/10
          border border-gray-500/20"
      >
        <span>
          {start
            ? `${format(start, "MMM dd, yyyy")} → ${
                end ? format(end, "MMM dd, yyyy") : "—"
              }`
            : "Select date range"}
        </span>
        <span>📅</span>
      </button>

      {/* Calendar */}
      {open && (
        <div className="absolute z-20 mt-2 rounded-lg border shadow-lg bg-white">
          <Calendar
            mode="multiple"
            selected={dates}
            numberOfMonths={1}
            onSelect={(selected) => {
              if (!selected) return;

              // reset if more than 2 clicks
              if (selected.length > 2) {
                setDates([selected[selected.length - 1]]);
                return;
              }

              setDates(selected);

              // close after 2nd date
              if (selected.length === 2) {
                setOpen(false);
              }
            }}
            className="w-[250px] rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
