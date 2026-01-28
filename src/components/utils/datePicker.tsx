"use client";

import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";

type Props = {
  /**
   * Pass default date range (in days): example: 72, 500
   */
  defaultDateRange?: number;
};

export default function CustomCalendar({ defaultDateRange }: Props) {
  const date = new Date();
  // if we have default date range: use it
  if (defaultDateRange) {
    date.setDate(date.getDate() - defaultDateRange);
  }
  // else setting 30 days as
  date.setDate(date.getDate() - 30);

  const [open, setOpen] = useState(false);
  const { setStartDate, setEndDate } = useSiteContext();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: date,
    to: new Date(),
  });

  useEffect(() => {
    if (!dateRange) return;

    setStartDate(dateRange.from);
    setEndDate(dateRange.to ?? new Date());
  }, [dateRange, setStartDate, setEndDate]);

  return (
    <div className="relative w-full max-w-[300px]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full cursor-pointer rounded-md px-3 py-2 flex justify-between items-center dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 border-[1px]"
      >
        <span className="text-sm">
          {dateRange?.from
            ? `${format(dateRange.from, "MMM dd, yyyy")} → ${format(
                dateRange?.to ?? new Date(),
                "MMM dd, yyyy",
              )}`
            : "Select date range"}
        </span>
        <span>📅</span>
      </button>

      {/* Dropdown Calendar */}
      {open && (
        <div className="absolute z-20 mt-2 border rounded-lg shadow-lg bg-white">
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            numberOfMonths={1}
            onSelect={(range) => {
              setDateRange(range);

              // Auto-close when both dates selected
              if (range?.from && range?.to) {
                setOpen(false);
              }
            }}
            className="rounded-lg w-[250px]"
          />
        </div>
      )}
    </div>
  );
}
