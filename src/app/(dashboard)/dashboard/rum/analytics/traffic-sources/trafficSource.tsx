"use client";

import { useEffect, useState } from "react";
import { useSiteContext } from "../../../siteContext";
import { Loader2Icon } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface TrafficSourceProps {
  activeDevice: string;
  originalTrafficData: any;
}

export default function TrafficSource({
  activeDevice,
  originalTrafficData,
}: TrafficSourceProps) {
  const { selectedSite } = useSiteContext();
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  // const [currentPage, setCurrentPage] = useState<number>(1);
  // const itemPerPage = 7;

  /* apply virtualization instead of pagination */
  const ROW_HEIGHT = 40; // in px
  const WINDOW_HEIGHT = 350; // in px

  const [scrollTop, setScrollTop] = useState<number>(0);

  const topIndex = Math.floor(scrollTop / ROW_HEIGHT);
  const rowsInsideWindow = Math.ceil(WINDOW_HEIGHT / ROW_HEIGHT);
  const bottomIndex = topIndex + rowsInsideWindow;

  const rowsToDisplay = trafficData.slice(topIndex, bottomIndex + 1);

  useEffect(() => {
    if (!originalTrafficData) {
      setTrafficData([]);
      return;
    }

    setLoading(true); // start loading when data arrives

    const deviceType = activeDevice?.toLowerCase();
    const filteredData =
      deviceType !== "all"
        ? originalTrafficData
            .filter((x: any) => x.referral_domain !== selectedSite)
            .filter((x: any) => x.device_type.toLowerCase() === deviceType)
        : originalTrafficData.filter(
            (x: any) => x.referral_domain !== selectedSite,
          );

    const aggregatedData = Object.values(
      filteredData.reduce((acc: any, curr: any) => {
        const domain = curr.referral_domain;
        if (!acc[domain]) {
          acc[domain] = { ...curr };
        } else {
          acc[domain].count += curr.count;
        }
        return acc;
      }, {}),
    );

    aggregatedData.sort((a: any, b: any) => b.count - a.count);

    setTrafficData(aggregatedData);
    setLoading(false);
  }, [activeDevice, originalTrafficData, selectedSite]);

  return (
    <div className="relative h-full">
      {loading || trafficData.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-black/30">
          {loading ? (
            <Loader2Icon className="text-primary/50 animate-spin w-5 h-5" />
          ) : (
            <Loader2Icon className="text-primary/50 animate-spin w-5 h-5" />
          )}
        </div>
      ) : null}

      {!loading && trafficData.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-500 border-b border-primary/10">
            <span className="py-2 font-medium">Referral Domain</span>
            <span className="py-2 pr-6 font-medium text-right">Count</span>
          </div>

          <div
            style={{
              position: "relative",
              height: WINDOW_HEIGHT,
              overflow: "auto",
              scrollbarColor:
                theme === "light" ? "#dfdfdf #f5f5f5" : "#343434 #1c1c1c",
              scrollbarWidth: "thin",
            }}
            className="text-sm"
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          >
            <div
              style={{
                position: "relative",
                height: trafficData.length * ROW_HEIGHT, // total scroll height
              }}
            >
              {rowsToDisplay.map((row, index) => {
                const actualIndex = topIndex + index;

                return (
                  <div
                    key={row.referral_domain}
                    style={{
                      position: "absolute",
                      top: actualIndex * ROW_HEIGHT,
                      left: 0,
                      right: 0,
                      height: ROW_HEIGHT,
                      // padding: "8px",
                      borderBottom: `1px solid ${theme === "light" ? `#dfdfdf` : `#343434`}`,
                    }}
                    className="flex justify-between items-center"
                  >
                    <span>{row.referral_domain}</span>
                    <span className="pr-3">{`${row.count > 1000 ? `${(row.count / 1000).toFixed(2)}k` : row.count}`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
