"use client";

import { ServerNetworkProps } from "@/app/api/network-and-server/get/route";
import { useSiteContext } from "../../siteContext";
import { cachedData, cleanExpiredCache } from "@/components/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { cacheKeyPrefix } from "@/data-types";
import { CustomCalendar, Title } from "@/components/theme";
import { CacheHitMiss } from "@/app/api/network-and-server/cache-hit-miss/route";
import { LoaderCircle } from "lucide-react";
import { Logs, OriginPerformanceChart, SidebarAnalysis } from ".";
import { NetworkServerSchema } from "@/app/api";

export default function Main() {
  const { selectedSite, startDate, endDate } = useSiteContext();
  const [serverNetworkData, setServerNetworkData] =
    useState<NetworkServerSchema>([]);
  const [cacheHitMissData, setCacheHitMissData] = useState<CacheHitMiss[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastIndex] = useState<{
    last_created_at: string | null;
    last_id: number | null;
  }>({ last_created_at: null, last_id: null }); // index of the last batch's last created_date for database cursor based fetching
  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedSite) return;

    cleanExpiredCache({
      prefix: cacheKeyPrefix["NETWORK-SERVER"],
      session_Storage: false,
    });

    cleanExpiredCache({
      prefix: cacheKeyPrefix["CACHE-HIT-MISS"],
      session_Storage: false,
    });

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        await getCacheHitMiss();

        await getServerNetworkTimings({
          domain: selectedSite,
          last_created_at: lastIndex.last_created_at,
          last_id: lastIndex.last_id,
          p_limit: 30,
          cacheKey: cacheKeyPrefix["NETWORK-SERVER"],
        });
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [selectedSite, startDate, endDate, lastIndex]);

  const sortedCacheHitMissData = useMemo(() => {
    return [...cacheHitMissData].sort(
      (a, b) => new Date(a.agg_time).getTime() - new Date(b.agg_time).getTime(),
    );
  }, [cacheHitMissData]);

  return (
    <>
      <div
        ref={headerRef}
        className="flex px-5 py-3 justify-between flex-col md:flex-row w-full items-start md:items-center gap-4 relative backdrop-blur-sm"
      >
        <Title
          title={"Trace"}
          description={"Caching & Server Performance"}
          tooltip={
            <div className="space-y-3 text-sm">
              <p>
                Trace detects Content Delivery Network (CDN) headers across page
                requests to estimate cache efficiency.
              </p>
              <p>
                By analyzing request timing and cache-related headers, it
                determines how effectively your CDN and caching infrastructure
                help deliver content faster to users.
              </p>
            </div>
          }
        />

        {/* optional future controls */}
        <CustomCalendar defaultDateRange={7} />
      </div>
      <div className="py-4 px-5 grid grid-cols-1 md:grid-cols-7 gap-4">
        <div className="col-span-5">
          {loading ? (
            <div className="h-75 flex items-center justify-center mx-12.5 my-10 bg-primary/5 animate-pulse">
              <LoaderCircle
                size={30}
                className="animate-spin text-primary/20"
              />
            </div>
          ) : sortedCacheHitMissData?.length === 0 ? (
            <div>No data available</div>
          ) : (
            <OriginPerformanceChart data={sortedCacheHitMissData} />
          )}

          {/* log section */}
          <Logs logData={serverNetworkData && serverNetworkData} />
        </div>
        <div className="col-span-2 sticky self-start top-20">
          <SidebarAnalysis
            networkServerData={serverNetworkData ?? []}
            cacheHitMissData={cacheHitMissData ?? []}
          />
        </div>
      </div>
    </>
  );

  /**
   *
   * @param props T & { domain: string; last_created_at?: string | null; last_id?: number | null; p_limit?: number;}
   * @returns server network data for analysis
   */
  async function getServerNetworkTimings<T extends Record<string, unknown>>(
    props: T & ServerNetworkProps,
  ) {
    const { domain, last_created_at, last_id, p_limit, ...extra } = props; // we can now pass extra data here

    const cacheKey = (extra as any).cacheKey;

    if (!domain || !p_limit || !cacheKey) return;

    try {
      const { response } = await cachedData({
        fn: async () => {
          const res = await fetch("/api/network-and-server/get", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              domain: domain,
              last_created_at: last_created_at,
              last_id: last_id,
              p_limit: p_limit,
            } as ServerNetworkProps),
          });

          const body: any = await res.json();

          if (!res.ok) {
            setLoading(false);
            throw new Error(body.message);
          }

          return body.x;
        },
        key: `${cacheKey}:${selectedSite}`,
        session_Storage: false,
        ttl: 5 * 60 * 1000,
      });

      setServerNetworkData(response);
    } catch (error: any) {
      setServerNetworkData([]);
      console.error("Failed to fetch server network data: ", error);
    }
  }

  /**
   * Cache Hit And Miss Data Collector
   */
  async function getCacheHitMiss() {
    if (!selectedSite || !startDate || !endDate) return;

    const s = startDate.toISOString().split("T")[0];
    const e = endDate.toISOString().split("T")[0];

    const key = `cacheKeyPrefix["CACHE-HIT-MISS"]:${selectedSite}-${s}-${e}`;

    try {
      const { response } = await cachedData({
        fn: async () => {
          const res = await fetch("/api/network-and-server/cache-hit-miss", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              domain: selectedSite,
              startDate: startDate,
              endDate: endDate,
            }),
          });
          const body: any = await res.json();

          if (!res.ok) {
            throw new Error(body.message);
          }

          return body.x;
        },
        session_Storage: false,
        key: key,
        ttl: 5 * 60 * 1000,
      });

      setCacheHitMissData(response);
    } catch (error: any) {
      setCacheHitMissData([]);
      console.error(error.message ?? "Couldn't fetch cache hit / miss data");
    }
  }
}
