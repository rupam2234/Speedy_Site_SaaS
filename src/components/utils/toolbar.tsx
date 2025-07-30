"use client";

import {
  CalendarArrowDown,
  ChartScatter,
  MonitorSmartphone,
  Split,
} from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface DateRangeProps {
  id: string;
  range: string;
}

export default function DashboardToolbar() {
  const pathname = usePathname();
  const {
    selectedDevice,
    setSelectedDevice,
    setDateRange,
    experienceType,
    setExperienceType,
    rumDistribution,
    setRumDistribution,
    setRumDateRange,
  } = useSiteContext();

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

  const [selectedRangeId, setSelectedRangeId] = useState<string>(
    DateRangeData[3]?.id || "last7"
  );

  useEffect(() => {
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
  }, [selectedRangeId, isRumPath]);

  const allowedPaths = [
    `/dashboard/cwv`,
    `/dashboard/pages`,
    `/dashboard/rum/overview`,
    `/dashboard/rum/cwv`,
    `/dashboard/`,
    `/dashboard/rum/lcp-images`,
  ];

  const isToolbarVisible = allowedPaths.includes(pathname);
  if (!isToolbarVisible) return null;

  const isOnCWVPage = pathname === `/dashboard/cwv`;
  const isOnRum =
    pathname === `/dashboard/rum/overview` || pathname === `/dashboard/rum/cwv`;
  function selectDevice(device: "Desktop" | "Mobile") {
    setSelectedDevice(device);
  }

  const selectedRange = DateRangeData.find(
    (item) => item.id === selectedRangeId
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
      {/* Left Section */}
      <div className="flex gap-3 md:items-center items-start flex-col md:flex-row">
        {/* Device toggle */}
        <div className="p-[6px] dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 border-[1px] rounded-sm">
          <div className="flex gap-2 w-full items-center px-2">
            <MonitorSmartphone size={18} className="mr-2" />
            <button
              className={`cursor-pointer font-medium px-4 py-1 rounded-sm text-sm ${
                selectedDevice === "Desktop"
                  ? `text-accent bg-accent-foreground dark:bg-secondary dark:text-primary hover:text-accent`
                  : ``
              }`}
              onClick={() => selectDevice("Desktop")}
            >
              Desktop
            </button>
            <button
              className={`cursor-pointer font-medium px-4 py-1 rounded-sm text-sm ${
                selectedDevice === "Mobile"
                  ? `text-accent bg-accent-foreground dark:bg-secondary dark:text-primary hover:text-accent`
                  : ``
              }`}
              onClick={() => selectDevice("Mobile")}
            >
              Mobile
            </button>
          </div>
        </div>

        {/* Distribution toggle (only for CWV page) */}
        {isOnCWVPage && (
          <div className="dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 w-[160px] border-[1px] px-1 rounded-sm">
            <div className="flex justify-between items-center pl-2 py-[2px] w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Split size={18} className="cursor-help " />
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="text-md space-y-2 w-[400px]"
                >
                  <ul className="list-disc p-4">
                    <li>
                      The <strong>75th percentile (p75)</strong> reflects the
                      experience of most users — lower is better for metrics
                      like LCP, INP, and TTFB.
                    </li>
                    <li>
                      The <strong>distribution</strong> shows how user
                      performance is spread across Good, Needs Improvement, and
                      Poor categories.
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>

              <Select value={experienceType} onValueChange={setExperienceType}>
                <SelectTrigger className="py-0 cursor-pointer border-0 ring-0 shadow-none focus-visible:ring-0 dark:bg-secondary-background hover:dark:bg-secondary-background rounded-sm border-none focus:ring-0 focus:outline-none">
                  <span className="text-primary font-medium">
                    {experienceType}
                  </span>
                </SelectTrigger>
                <SelectContent
                  className="w-[200px]"
                  side="bottom"
                  align="center"
                >
                  <SelectGroup>
                    {["p75", "Distribution"].map((x, index) => (
                      <SelectItem key={index} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* RUM Distribution */}
        {isOnRum && (
          <div className="dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 w-auto border-[1px] px-1 rounded-sm">
            <div className="flex justify-between items-center pl-2 py-[2px] w-full">
              <ChartScatter size={18} />
              <Select
                value={rumDistribution}
                onValueChange={setRumDistribution}
              >
                <SelectTrigger className="py-0 cursor-pointer border-0 ring-0 shadow-none focus-visible:ring-0 dark:bg-secondary-background hover:dark:bg-secondary-background rounded-sm border-none focus:ring-0 focus:outline-none">
                  <span className="text-primary font-medium">
                    {rumDistribution}
                  </span>
                </SelectTrigger>
                <SelectContent
                  className="min-w-[--radix-select-trigger-width] p-0 dark:bg-secondary-background"
                  side="bottom"
                  align="center"
                >
                  <SelectGroup>
                    {["p50", "p75", "p90", "p95", "p99"].map((x, index) => (
                      <SelectItem key={index} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Right: Date Range Dropdown */}
      <div className="p-[2px] dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 border-[1px] rounded-sm">
        <div className="flex gap-2 w-[220px] justify-between items-center pl-2">
          <CalendarArrowDown size={18} className="mr-2" />
          <Select value={selectedRangeId} onValueChange={setSelectedRangeId}>
            <SelectTrigger className="px-4 py-0 text-sm ring-0 text-primary focus-visible:ring-0 dark:bg-secondary-background hover:dark:bg-secondary-background font-medium rounded-sm bg-transparent border-none focus:ring-0 focus:outline-none">
              <SelectValue placeholder="Select Range">
                {selectedRange?.range}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-[200px] md:mr-[10px]">
              <SelectGroup>
                {DateRangeData.map((item, index) => (
                  <SelectItem value={item.id} key={index}>
                    {item.range}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
