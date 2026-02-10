"use client";

import { ChartPie, Globe, Loader2Icon } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../../siteContext";
import { LLMTrafficSource, TrafficSource } from "../index";
import { countryDistributionApi, trafficSourceApi } from "../cf-apis/calls";

const CountryTrafficMap = lazy(
  () => import(`../visual-traffic-map/trafficMapContainer`),
);

const UserHappinessMap = lazy(
  () => import(`../visual-happiness-map/happinesMap`),
); // lazyload the component

export function SourceHandler() {
  const {
    selectedSite,
    selectedDevice,
    startDate,
    endDate,
    selectedGeoType,
    setSelectedGeoType,
  } = useSiteContext();

  const [activeSource, setActiveSource] = useState<
    "All Traffic" | "LLM Traffic"
  >("All Traffic");
  const [originalTrafficData, setOriginalTrafficData] = useState<any[]>([]);
  const [userHappinessData, setHappinessData] = useState<any[]>([]);
  const [countryDist, setCountryDist] = useState<any>([]);
  const [combinedData, setCombinedData] = useState<any>({});

  const trafficSourceRef = useRef(null); // to lazyload traffic source data
  const trafficCountryRef = useRef(null); // to lazyload traffic country distributions
  const userHappinessRef = useRef<string | null>(null); // to control load user happiness data

  useEffect(() => {
    const refs = [trafficSourceRef, trafficCountryRef];

    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          if (entry.target === trafficSourceRef.current) {
            getTrafficSource();
          }

          if (entry.target === trafficCountryRef.current) {
            fetchCountryDistribution();
          }

          // stop observing this target once loaded
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "100px",
      },
    );

    refs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [startDate, endDate, selectedSite]); // handles lazyload

  useEffect(() => {
    if (countryDist) {
      const newCombinedData = CountryDistributions(countryDist);
      setCombinedData(newCombinedData);
    }
  }, [countryDist, selectedDevice]);

  useEffect(() => {
    if (selectedGeoType !== "UX Experience") return;
    const key = `${selectedSite}-${startDate}-${endDate}`;

    if (userHappinessRef.current === key) {
      return;
    }

    fetchUserHappinesGeo();

    userHappinessRef.current = key;
  }, [selectedGeoType, selectedSite, startDate, endDate]);

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4 mb-4">
      {/* Traffic Source */}
      <div
        ref={trafficSourceRef}
        className="col-span-1 relative bg-white dark:bg-secondary-background p-5 rounded-sm border border-primary/20"
      >
        <div className="flex items-center gap-2 mb-7.5">
          <span>
            <ChartPie size={16} className="text-primary dark:text-primary" />
          </span>
          <div className="flex items-center text-primary dark:text-primary font-semibold gap-2">
            <span>Traffic Sources</span>
          </div>
        </div>
        <div className="absolute top-5 right-5">
          {["All Traffic", "LLM Traffic"].map((x: string) => (
            <button
              className={`mx-2 cursor-pointer hover:underline hover:underline-offset-4 hover:decoration-[#bdbdbe] ${
                activeSource === x &&
                `underline underline-offset-4 decoration-[#bdbdbe]`
              }`}
              onClick={() =>
                setActiveSource(x as "All Traffic" | "LLM Traffic")
              }
              key={x}
            >
              {x}
            </button>
          ))}
        </div>
        {activeSource === "All Traffic" ? (
          <TrafficSource
            activeDevice={selectedDevice}
            originalTrafficData={originalTrafficData}
          />
        ) : (
          // <Virtualization /> apply later
          <LLMTrafficSource
            activeDevice={selectedDevice}
            originalTrafficData={originalTrafficData}
          />
        )}
      </div>
      {/* Geo Distribution */}
      <div
        ref={trafficCountryRef}
        className="col-span-1 bg-white dark:bg-secondary-background p-5 rounded-sm border border-primary/20"
      >
        <div className="flex items-center justify-between">
          <div className="font-semibold text-primary/80 flex gap-2 items-center">
            <span>
              <Globe
                size={16}
                className="fill-blue-300 text-primary dark:text-primary-foreground"
              />
            </span>
            <span>Geo Distribution</span>
            {/* {selectedGeoType === "User Happiness" ? (
              <div className="">
                <TooltipIcon
                  content={
                    "If your user happiness scores vary significantly across regions, it's a sign that performance isn't consistent worldwide. To address this, try our Global Performance Booster — a CDN wrapper designed to reduce regional latency and improve metrics like TTFB. You can find it in the left panel under Enhancements > Boost TTFB."
                  }
                  trigger={<Lightbulb size={16} className="fill-yellow-200" />}
                  delay={300}
                  side="bottom"
                />
              </div>
            ) : (
              <></>
            )} */}
          </div>
          <div className="flex gap-4 items-center">
            {["Visitors", "UX Experience"].map((x, index) => (
              <button
                key={index}
                className={`bg-transparent hover:underline decoration-primary/30 underline-offset-4 cursor-pointer ${
                  selectedGeoType === x ? "underline" : ""
                }`}
                onClick={() =>
                  setSelectedGeoType(x as "Visitors" | "UX Experience")
                }
              >
                {x}
              </button>
            ))}
          </div>
        </div>
        <div className="py-8 h-auto md:h-107.5">
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center">
                <Loader2Icon
                  size={18}
                  className="text-primary/20 animate-spin"
                />
              </div>
            }
          >
            {selectedGeoType === "Visitors" ? (
              <CountryTrafficMap
                trafficData={combinedData}
                deviceType={
                  selectedDevice === "Desktop"
                    ? "desktop"
                    : selectedDevice === "Mobile"
                      ? "mobile"
                      : selectedDevice === "Tablet"
                        ? "tablet"
                        : "all"
                }
              />
            ) : selectedGeoType === "UX Experience" ? (
              <UserHappinessMap
                happinessData={
                  userHappinessData.length > 0 ? userHappinessData : []
                }
              />
            ) : null}
          </Suspense>
        </div>
      </div>
    </section>
  );

  async function getTrafficSource() {
    if (!startDate || !endDate || !selectedSite) return;

    try {
      const data: any = await trafficSourceApi({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        domain: selectedSite,
        key: "secret_for_speedy_site",
      });

      // store data directly
      setOriginalTrafficData(data || []);
    } catch (error) {
      console.error("Failed to fetch traffic source:", error);
      setOriginalTrafficData([]);
    }
  }

  async function fetchCountryDistribution() {
    if (!startDate || !endDate || !selectedSite) return;

    try {
      const res = await countryDistributionApi({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        domain: selectedSite,
      });
      if (res && Array.isArray(res)) {
        setCountryDist(res);
      }
    } catch (error) {
      console.error(
        "Failed to fetch traffic distribution based on countries:",
        error,
      );
      setCountryDist([]);
    }
  }

  function CountryDistributions(data: any[]) {
    if (Array.isArray(data)) {
      const combinedCountryDistribution: { [key: string]: number } = {};
      const deviceTypeCountryDistributions: {
        [key: string]: { [key: string]: number };
      } = {};
      data.forEach((entry) => {
        try {
          const countryDistribution = JSON.parse(entry.country_distribution);
          deviceTypeCountryDistributions[entry.device_type] =
            deviceTypeCountryDistributions[entry.device_type] || {};
          Object.keys(countryDistribution).forEach((country) => {
            combinedCountryDistribution[country] =
              (combinedCountryDistribution[country] || 0) +
              countryDistribution[country];
            deviceTypeCountryDistributions[entry.device_type][country] =
              (deviceTypeCountryDistributions[entry.device_type][country] ||
                0) + countryDistribution[country];
          });
        } catch (error) {
          console.error(
            "Failed to parse country_distribution for device_type",
            entry.device_type,
            error,
          );
        }
      });
      const combinedData = {
        device_type: "all",
        country_distribution: JSON.stringify(combinedCountryDistribution),
      };
      const newArray = [
        ...Object.keys(deviceTypeCountryDistributions).map((deviceType) => {
          return {
            device_type: deviceType,
            country_distribution: JSON.stringify(
              deviceTypeCountryDistributions[deviceType],
            ),
          };
        }),
        combinedData,
      ];
      return newArray;
    }
    return data;
  }

  async function fetchUserHappinesGeo() {
    if (!startDate || !endDate || !selectedSite) return;

    const res = await fetch("/api/rum/analytics/happiness-geo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
      body: JSON.stringify({
        domain: selectedSite,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      }),
    });
    if (!res.ok) {
      console.error(res.statusText);
      setHappinessData([]);
    }
    const data: any = await res.json();
    setHappinessData(data.data);
  }
}
