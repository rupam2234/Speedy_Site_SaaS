"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ChartScatter, InfoIcon, MonitorSmartphone } from "lucide-react";
import { useSiteContext } from "../../app/(dashboard)/dashboard/siteContext";
import { useEffect, useRef, useState } from "react";
import { SidebarTrigger } from "../ui/sidebar";
import {
  useIsMobile,
  CustomCalendar,
  CustomTooltip,
  DeviceController,
} from ".";

interface Props {
  /**
   * Enables the "All" device type option.
   */
  enableAllDevices?: boolean;

  /**
   * Enables distribution view.
   */
  enableDistribution?: boolean;

  /**
   * Disables the tablet device option.
   */
  disableTablet?: boolean;

  /**
   * Default date range in days (e.g. 72, 500).
   */
  defaultDateRange?: number;

  /**
   * Enable sticky toolbar, default: false
   */
  isSticky?: boolean;
}

export default function PrimaryToolbar({
  enableAllDevices,
  enableDistribution,
  disableTablet,
  defaultDateRange,
  isSticky,
}: Props) {
  const { rumDistribution, setRumDistribution } = useSiteContext();

  const isMobile = useIsMobile();
  const [sticky, setIsSticky] = useState<boolean>(false); // this sets border bottom when user is scrolling
  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;

      const { top } = headerRef.current.getBoundingClientRect();
      setIsSticky(top <= 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={headerRef}
      className={`flex flex-col md:flex-row p-4 w-full items-start gap-3 md:justify-between bg-transparent`}
      style={{
        position: isSticky && !isMobile ? "sticky" : "unset",
        top: 0,
        zIndex: 50,
        background: "inherit",
        borderBottom: sticky ? "1px solid rgba(0,0,0,0.1)" : "",
      }}
    >
      <div className="flex gap-3 md:items-center items-start flex-col md:flex-row">
        {sticky && !isMobile ? <SidebarTrigger /> : <></>}
        <DeviceController
          disableAllDevices={enableAllDevices === false}
          disableTablet={disableTablet !== undefined && disableTablet}
        />
        <div className="flex items-center gap-2">
          {enableDistribution ? (
            <>
              <div className="dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 w-auto border px-1 rounded-sm">
                <div className="flex justify-between items-center pl-2 py-0.5 w-full">
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
              <CustomTooltip
                content={
                  "Percentiles help normalize performance by showing real user experiences. P50 shows the median (typical) experience, P75 is used in Core Web Vitals to represent the majority of users, and higher percentiles like P90 or P99 highlight slower experiences at the tail end. These help uncover issues that averages or medians might miss."
                }
                maxWidth="16rem"
                side="bottom"
                trigger={
                  <InfoIcon
                    className="bg-transparent hover:bg-primary/5 text-primary/50 p-0.5 rounded-full"
                    size={22}
                  />
                }
              />
            </>
          ) : (
            <></>
          )}
        </div>
      </div>
      <CustomCalendar defaultDateRange={defaultDateRange} />
    </div>
  );
}
