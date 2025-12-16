"use client";

import { MonitorSmartphone } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface DateRangeProps {
  id: string;
  range: string;
}

export default function DashboardToolbar() {
  const pathname = usePathname();
  const { selectedDevice, setSelectedDevice, setDateRange, setRumDateRange } =
    useSiteContext();

  const overView = pathname === "/dashboard";
  const rumOverview = pathname === `/dashboard/rum/overview`;

  const pageGroupsRum =
    pathname === "/dashboard/rum/pages" ||
    pathname === "/dashboard/rum/third-party";
  const isRumPath = pathname.includes("rum");

  const DateRangeData: DateRangeProps[] = isRumPath
    ? [
        { id: "last7", range: "Last 7 Days" },
        { id: "last24Hours", range: "Last 24 Hours" },
        { id: "last30", range: "Last 30 Days" },
        { id: "last90", range: "Last 90 Days" },
      ]
    : [
        { id: "last7", range: "Last 7 Days" },
        { id: "thisMonth", range: "This Month" },
        { id: "lastMonth", range: "Last Month" },
        { id: "last6Months", range: "Last 6 Months" },
        { id: "last12Months", range: "Last 12 Months" },
        { id: "thisYear", range: "This Year" },
      ];

  const MaxSevenDays: DateRangeProps[] = pageGroupsRum
    ? [
        { id: "last7", range: "Last 7 Days" },
        { id: "last24Hours", range: "Last 24 Hours" },
      ]
    : [];

  const [selectedRangeId, setSelectedRangeId] = useState<string>(
    pageGroupsRum ? "last7" : DateRangeData[3]?.id || "last7",
  );

  useEffect(() => {
    if (pageGroupsRum) {
      const today = new Date();
      let startDate = today.toISOString().split("T")[0];

      if (selectedRangeId === "last7") {
        const past = new Date(today);
        past.setDate(today.getDate() - 6);
        startDate = past.toISOString().split("T")[0];
      }

      setDateRange(startDate, today.toISOString().split("T")[0]);
      setRumDateRange(
        selectedRangeId as unknown as "7days" | "24hours" | "30days" | "90days",
      );
      return;
    }

    const dateRanges = GetDateRange(selectedRangeId);
    setDateRange(dateRanges[0], dateRanges[1]);

    if (isRumPath) {
      switch (selectedRangeId) {
        case "last24Hours":
          setRumDateRange("24hours");
          break;
        case "last7":
          setRumDateRange("7days");
          break;
        case "last30":
          setRumDateRange("30days");
          break;
        case "last90":
          setRumDateRange("90days");
          break;
        default:
          setRumDateRange("7days");
      }
    }
  }, [selectedRangeId, isRumPath, pageGroupsRum]);

  const allowedPaths = [
    `/dashboard/cwv`,
    `/dashboard/pages`,
    `/dashboard/rum/web-vitals`,
    `/dashboard/rum/overview`,
    `/dashboard/rum/cwv`,
    `/dashboard`,
    `/dashboard/rum/lcp-images`,
    `/dashboard/rum/pages`,
    `/dashboard/rum/third-party`,
  ];

  const isToolbarVisible = allowedPaths.includes(pathname);
  if (!isToolbarVisible) return null;

  function selectDevice(device: "Desktop" | "Mobile" | "Tablet" | "All") {
    setSelectedDevice(device);
  }

  const selectedRange = (pageGroupsRum ? MaxSevenDays : DateRangeData).find(
    (item) => item.id === selectedRangeId,
  );

  function GetDateRange(rangeKey: string): [string, string] {
    const today = new Date();
    const todayISO = today.toISOString().split("T")[0];
    let startDate = todayISO;
    let endDate = todayISO;

    switch (rangeKey) {
      case "last7": {
        const past = new Date(today);
        past.setDate(today.getDate() - 6);
        startDate = past.toISOString().split("T")[0];
        break;
      }
      case "thisMonth":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        break;
      case "lastMonth":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          .toISOString()
          .split("T")[0];
        endDate = new Date(today.getFullYear(), today.getMonth(), 0)
          .toISOString()
          .split("T")[0];
        break;
      case "last6Months": {
        const six = new Date(today);
        six.setMonth(today.getMonth() - 5);
        six.setDate(1);
        startDate = six.toISOString().split("T")[0];
        break;
      }
      case "last12Months": {
        const twelve = new Date(today);
        twelve.setMonth(today.getMonth() - 11);
        twelve.setDate(1);
        startDate = twelve.toISOString().split("T")[0];
        break;
      }
      case "thisYear":
        startDate = new Date(today.getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0];
        break;
    }

    return [startDate, endDate];
  }

  return (
    <div className="flex flex-col md:flex-row p-5 w-full items-start gap-3 md:justify-between bg-transparent">
      <div className="flex gap-3 md:items-center items-start flex-col md:flex-row">
        {rumOverview && (
          <div className="p-[6px] dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 border-[1px] rounded-sm">
            <div className="flex gap-2 w-full items-center px-2">
              <MonitorSmartphone size={18} className="mr-2" />
              {["Desktop", "Mobile", "Tablet", "All"].map((device) => (
                <button
                  key={device}
                  className={`cursor-pointer font-medium px-4 py-1 rounded-sm text-sm ${
                    selectedDevice === device
                      ? `text-accent bg-accent-foreground dark:bg-secondary dark:text-primary hover:text-accent`
                      : ``
                  }`}
                  onClick={() => selectDevice(device as any)}
                >
                  {device}
                </button>
              ))}
            </div>
          </div>
        )}

        {!rumOverview && !overView && (
          <div className="p-[6px] dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 border-[1px] rounded-sm">
            <div className="flex gap-2 w-full items-center px-2">
              <MonitorSmartphone size={18} className="mr-2" />
              {["Desktop", "Mobile", "Tablet"].map((device) => (
                <button
                  key={device}
                  className={`cursor-pointer font-medium px-4 py-1 rounded-sm text-sm ${
                    selectedDevice === device
                      ? `text-accent bg-accent-foreground dark:bg-secondary dark:text-primary hover:text-accent`
                      : ``
                  }`}
                  onClick={() => selectDevice(device as any)}
                >
                  {device}
                </button>
              ))}
            </div>
          </div>
        )}

        {overView && (
          <div className="p-[6px] dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 border-[1px] rounded-sm">
            <div className="flex gap-2 w-full items-center px-2">
              <MonitorSmartphone size={18} className="mr-2" />
              {["Desktop", "Mobile"].map((device) => (
                <button
                  key={device}
                  className={`cursor-pointer font-medium px-4 py-1 rounded-sm text-sm ${
                    selectedDevice === device
                      ? `text-accent bg-accent-foreground dark:bg-secondary dark:text-primary hover:text-accent`
                      : ``
                  }`}
                  onClick={() => selectDevice(device as any)}
                >
                  {device}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!rumOverview && !overView && (
        <div className="p-[2px] dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 border-[1px] rounded-sm">
          <Select value={selectedRangeId} onValueChange={setSelectedRangeId}>
            <SelectTrigger className="px-4 py-0 text-end text-sm ring-0 text-primary focus-visible:ring-0 dark:bg-secondary-background hover:dark:bg-secondary-background font-medium rounded-sm bg-transparent border-none focus:ring-0 focus:outline-none">
              <SelectValue placeholder="Select Range">
                {selectedRange?.range}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-auto">
              <SelectGroup>
                {(pageGroupsRum ? MaxSevenDays : DateRangeData).map(
                  (item, index) => (
                    <SelectItem value={item.id} key={index}>
                      {item.range}
                    </SelectItem>
                  ),
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}

      {rumOverview && (
        <span className="flex md:mt-3 gap-3 item-center cursor-help text-accent-foreground/80 dark:text-accent-foreground font-semibold">
          <div className="relative flex items-center justify-center mt-1 w-4 h-4">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <p>Live Data</p>
        </span>
      )}
    </div>
  );
}
