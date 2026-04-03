"use client";

import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { CustomTooltip } from ".";

type Props = {
  /**
   * Pass default date range (in days): example: 72, 500
   */
  defaultDateRange?: number;

  /**
   * Limit will force calender to only allow limited no of date range to select
   */
  limited?: number;
};

export default function CustomCalendar({ defaultDateRange, limited }: Props) {
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
    // this means we will expose the date object to context when both startDate and endDate are ready
    if (dates.length !== 2) return;

    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());

    setStartDate(sorted[0]);
    setEndDate(sorted[1] ?? sorted[0]);
  }, [dates, setStartDate, setEndDate]);

  const start = dates[0];
  const end = dates[1];

  // to disable dates ahead of limited dates (gray dates)
  const today = new Date();

  const disabledDays =
    dates.length === 1 && limited
      ? (date: Date) => {
          const first = dates[0];

          const minDate = new Date(first);
          minDate.setDate(first.getDate() - limited);

          const maxDate = new Date(first);
          maxDate.setDate(first.getDate() + limited);

          // do not allow future beyond today
          if (maxDate > today) {
            maxDate.setTime(today.getTime());
          }

          return date < minDate || date > maxDate;
        }
      : undefined;

  // end of gray dates

  return (
    <div className="relative w-full max-w-75">
      <div className="flex items-center gap-2">
        <CustomTooltip
          content={
            <>
              The date range defaults to the past 30 days from today, but you
              can modify it as needed.
            </>
          }
        />

        {/* Trigger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full cursor-pointer rounded-md px-3 py-2
          flex justify-between items-center gap-3 text-sm
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
      </div>

      {/* Calendar */}
      {open && (
        <div className="absolute right-0 z-20 mt-2 rounded-lg border shadow-lg bg-white">
          <Calendar
            mode="multiple"
            selected={dates}
            numberOfMonths={1}
            disabled={disabledDays}
            onSelect={(selected) => {
              if (!selected) return;

              // reset if more than 2 clicks
              if (selected.length > 2) {
                setDates([selected[selected.length - 1]]);
                return;
              }

              setDates(selected);

              // opon selecting 2nd date
              if (selected.length === 2) {
                setOpen(false);
              }
            }}
            className="w-62.5 rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
