"use client";

import { ReactNode, useEffect, useMemo, useState, useRef } from "react";
import DashboardToolbar from "@/components/utils/toolbar";
import { useSiteContext } from "../../siteContext";
import Link from "next/link";
import RumCwvChart from "../helpers/webvitalscharts";
// import { ArrowLeftSquare, ArrowRightSquare } from "lucide-react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import LCPBreakdownChart from "../helpers/lcpBreakDown";
import CLSBreakdownChart from "../helpers/clsBreakDown";
import TTFBBreakdownChart from "../helpers/ttfbBreakDown";
import FCPBreakdownChart from "../helpers/fcpBreakDown";
import INPBreakdownChart from "../helpers/inpBreakdown";

interface MetricKey {
  name: string;
  score?: number | null;
  value?: number | null;
  CruX?: number | null;
  abbreviation?: "LCP" | "CLS" | "INP" | "TTFB" | "FCP" | "ES";
  desc?: ReactNode;
  impact?: ReactNode;
}

type p75s = {
  cls?: number | null | undefined;
  inp?: number | null | undefined;
  lcp?: number | null | undefined;
  ttfb?: number | null | undefined;
  fcp?: number | null | undefined;
};

const baseMetrics: MetricKey[] = [
  {
    name: "User Experience Score",
    abbreviation: "ES",
    impact: (
      <div className="space-y-2">
        <ul className="list-disc text-sm pl-5">
          <li>This is your &quot;customer experience health score.&quot;</li>
          <li>
            A higher score correlates with better conversion rates, lower bounce
            rates, and higher user satisfaction.
          </li>
          <li>
            Drops in this score may indicate site-wide regressions that need
            your attention.
          </li>
        </ul>
      </div>
    ),
  },
  {
    name: "Largest Contentful Paint",
    abbreviation: "LCP",
    desc: (
      <div className="space-y-1">
        <p>
          LCP measures the time it takes for the largest visible content on the
          page — like a big image or heading — to fully load. A fast LCP means
          the main part of the page is ready for users quickly.
        </p>
        <Link
          className="text-blue-400 hover:text-blue-600"
          href="https://web.dev/lcp/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more
        </Link>
      </div>
    ),
    impact: (
      <div className="space-y-2">
        <ul className="list-disc text-sm pl-5">
          <li>
            Research shows that improving LCP by 1 second can increase
            conversion rates by 10–20%.
          </li>
          <li>
            Improves time on site, reduces bounce rate, and supports your SEO
            and paid ad ROI.
          </li>
          <li>
            Faster perceived loading gives a psychological edge over competitors
            with slower sites.
          </li>
        </ul>
      </div>
    ),
  },
  {
    name: "Layout Shift",
    abbreviation: "CLS",
    desc: (
      <div className="space-y-1">
        <p>
          This metric tracks how much the page content moves around while
          it&apos;s loading. For example, if buttons or images suddenly shift
          position, it can be frustrating for users. Lower CLS means the page
          feels stable.
        </p>
        <Link
          className="text-blue-400 hover:text-blue-600"
          href="https://web.dev/cls/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more
        </Link>
      </div>
    ),
    impact: (
      <div className="space-y-2">
        <ul className="list-disc text-sm pl-5">
          <li>
            Layout jumps often break trust instantly — users think the site is
            glitchy and leave before interacting.
          </li>
          <li>
            Reducing layout shift leads to smoother checkouts, fewer support
            complaints, and higher completion rates on forms and CTAs.
          </li>
        </ul>
      </div>
    ),
  },
  {
    name: "Interaction to Next Paint",
    abbreviation: "INP",
    desc: (
      <div className="space-y-1">
        <p>
          INP measures how quickly the page responds when a user interacts with
          it — like clicking a button or typing. A low INP means the page feels
          fast and responsive.
        </p>
        <Link
          className="text-blue-400 hover:text-blue-600"
          href="https://web.dev/inp/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more
        </Link>
      </div>
    ),
    impact: (
      <div className="space-y-2">
        <ul className="list-disc text-sm pl-5">
          <li>
            INP is critcal on complex flows (checkout, booking, dashboards,
            funnels), where lag causes frustration and form abandonment.
          </li>
          <li>
            Improving INP leads to faster-feeling apps and higher task
            completion rates.
          </li>
          <li>
            People don&apos;t wait — if a page doesn&apos;t react fast, they
            reload, leave, or give up.
          </li>
        </ul>
      </div>
    ),
  },
  {
    name: "First Contentful Paint",
    abbreviation: "FCP",
    desc: (
      <div className="space-y-1">
        <p>
          FCP measures how long it takes for the browser to render the first
          piece of content — like text or images — after navigating to a page.
        </p>
        <Link
          className="text-blue-400 hover:text-blue-600"
          href="https://web.dev/fcp/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more
        </Link>
      </div>
    ),
    impact: (
      <div className="space-y-2">
        <ul className="list-disc text-sm pl-5">
          <li>
            Faster FCP builds user confidence and decreases bounce rates by
            giving immediate visual feedback that the site is loading.
          </li>
          <li>
            Especially critical for mobile and low-bandwidth users who are quick
            to abandon unresponsive sites.
          </li>
          <li>
            Supports higher engagement and retention by reducing the &quot;blank
            screen&quot; delay during navigation.
          </li>
        </ul>
      </div>
    ),
  },
  {
    name: "Time to First Byte",
    abbreviation: "TTFB",
    desc: (
      <div className="space-y-1">
        <p>
          TTFB shows how long it takes for the browser to receive the first bit
          of data from the server after a request is made. Faster TTFB means
          quicker start of loading the page.
        </p>
        <Link
          className="text-blue-400 hover:text-blue-600"
          href="https://web.dev/ttfb/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more about TTFB
        </Link>
      </div>
    ),
    impact: (
      <div className="space-y-2">
        <ul className="list-disc text-sm pl-5">
          <li>
            A slow TTFB delays the entire page load — users stare at a blank
            screen before anything happens, especially on mobile or slow
            connections.
          </li>
          <li>
            It directly affects bounce rates from paid ads or SEO — users
            won&apos;t wait for slow servers to respond.
          </li>
          <li>Improving TTFB speeds up everything.</li>
        </ul>
      </div>
    ),
  },
];

// Add the missing cwv_ranges constant
const cwv_ranges = {
  lcp: [2500, 4000],
  fcp: [1800, 3000],
  inp: [200, 500],
  cls: [0.1, 0.25],
  ttfb: [800, 1800],
};

export default function RumCWV() {
  const { rumDateRange, selectedSite, selectedDevice, rumDistribution } =
    useSiteContext();

  const [activeData, setActiveData] = useState<any[]>([]);
  const [activeMetric, setActiveMetric] = useState<MetricKey>(baseMetrics[1]);
  const [descTrigger] = useState<boolean>(true);
  const [lcp_analysis, set_lcp_analysis] = useState<any>();
  const [cls_analysis, set_cls_analysis] = useState<any>();
  const [ttfb_analysis, set_ttfb_analysis] = useState<any>();
  const [inp_analysis, set_inp_analysis] = useState<any>();
  const [fcp_analysis, set_fcp_analysis] = useState<any>();
  const [es, setEs] = useState<number | null>(null);

  const cacheRef = useRef<Record<string, { data: any; timestamp: number }>>({});
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_EXPIRY;
  };

  const getCacheKey = (url: string, body: any) => {
    return `${url}-${JSON.stringify(body)}`;
  };

  useEffect(() => {
    if (selectedSite) {
      get_rum_vitals();
    }
  }, [selectedSite, rumDateRange]);

  useEffect(() => {
    (async () => {
      if (!selectedSite) return;

      switch (activeMetric.abbreviation) {
        case "LCP":
          await get_lcp_analysis();
          break;
        case "CLS":
          await get_cls_analysis();
          break;
        case "TTFB":
          await get_ttfb_analysis();
          break;
        case "INP":
          await get_inp_analysis();
          break;
        case "FCP":
          await get_fcp_analysis();
          break;
      }
    })();
  }, [selectedSite, activeMetric, rumDateRange]);

  const displayMetrics = useMemo(
    () => getUpdatedMetrics(),
    [activeData, selectedDevice, rumDistribution]
  );

  useEffect(() => {
    const updated = displayMetrics.find(
      (m) => m.abbreviation === activeMetric.abbreviation
    );
    if (updated) setActiveMetric(updated);
  }, [activeData, selectedDevice]);

  useMemo(() => {
    if (!activeData || activeData.length === 0) return;

    const esData = activeData
      .filter((x) => x.device_category === selectedDevice.toLowerCase())
      .map(
        (i): p75s => ({
          lcp: i.lcp_p75,
          cls: i.cls_p75,
          fcp: i.fcp_p75,
          inp: i.inp_p75,
          ttfb: i.ttfb_p75,
        })
      );

    setEs(computeExperienceScore(esData));
  }, [activeData, selectedDevice]);

  if (activeData.length === 0 || !activeData) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <DashboardToolbar />
      <div className="m-5 grid grid-cols-1 md:grid-cols-12 gap-2 overflow-x-hidden">
        {/* Sidebar */}
        <div className="md:col-span-2 border border-primary/10 max-h-fit rounded-sm text-primary dark:bg-secondary-background/20 bg-transparent">
          {displayMetrics.map((x, index) => {
            const isActive = x.name === activeMetric.name;

            return (
              <div
                key={index}
                onClick={() => {
                  if (x.abbreviation !== "ES") {
                    setActiveMetric(x);
                  }
                }}
                className={`p-4 space-y-3 border-b border-primary/10 transition-colors ${
                  x.abbreviation !== "ES"
                    ? "cursor-pointer"
                    : "opacity-70 cursor-default"
                } ${
                  isActive
                    ? "bg-white dark:bg-secondary-background rounded-sm"
                    : "bg-primary/5"
                }`}
              >
                <p className="text-sm font-medium text-primary dark:text-primary/80">
                  {x.name}
                </p>

                <div className="flex items-center gap-4">
                  {x.name === "User Experience Score" && es !== null && (
                    <ScoreCircle score={es} />
                  )}

                  {x.name !== "User Experience Score" && (
                    <div className="flex space-y-1 flex-col text-xs dark:text-primary w-full">
                      <span className="font-medium">
                        Value: {x.value?.toFixed(2) ?? "—"}
                        {x.abbreviation === "CLS" ? "" : " ms"}
                      </span>
                    </div>
                  )}
                </div>

                {x.name !== "Experience Score" &&
                  x.value != null &&
                  (() => {
                    const key =
                      x.abbreviation?.toLowerCase() as keyof typeof cwv_ranges;
                    const range = cwv_ranges[key];

                    if (!range) return null;

                    const [good, poor] = range;
                    const value = x.value ?? 0;

                    // Normalize value position between 0% to 100% of the bar based on poor threshold
                    const position = Math.min((value / poor) * 100, 100);

                    // Determine color segment
                    let color = "bg-[#FF9898]";
                    if (value < good) color = "bg-[#66cc8f]";
                    else if (value < poor) color = "bg-yellow-500/80";

                    return (
                      <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        {/* Colored indicator */}
                        <div
                          className={`${color} h-1.5 transition-all duration-500`}
                          style={{ width: `${position}%` }}
                        />
                      </div>
                    );
                  })()}
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="md:col-span-10 border border-primary/10 rounded-sm bg-primary-foreground dark:bg-secondary-background md:ml-1 p-4">
          <div className="relative flex gap-2 min-w-0 max-h-fit">
            {/* Main Chart Area */}
            <div
              className={`transition-all duration-300 ease-in-out ${
                descTrigger ? "w-full" : "w-full"
              } space-y-2`}
            >
              {["LCP", "FCP", "CLS", "INP", "TTFB"].includes(
                activeMetric.abbreviation ?? ""
              ) && (
                <>
                  <RumCwvChart
                    metric_key={activeMetric.abbreviation?.toLowerCase() || ""}
                    data={activeData}
                  />
                </>
              )}
            </div>
          </div>
          <div className="my-4 md:my-7">
            {activeMetric.abbreviation === "LCP" ? (
              <>
                <LCPBreakdownChart data={lcp_analysis || []} />
              </>
            ) : activeMetric.abbreviation === "CLS" ? (
              <>
                <CLSBreakdownChart data={cls_analysis || []} />
              </>
            ) : activeMetric.abbreviation === "TTFB" ? (
              <>
                <TTFBBreakdownChart data={ttfb_analysis || []} />
              </>
            ) : activeMetric.abbreviation === "INP" ? (
              <>
                <INPBreakdownChart data={inp_analysis || []} />
              </>
            ) : activeMetric.abbreviation === "FCP" ? (
              <>
                <FCPBreakdownChart data={fcp_analysis || []} />
              </>
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // Fetch RUM vitals with caching
  async function get_rum_vitals() {
    try {
      const url = "/api/rum/rum-web-vitals";
      const body = {
        domain_name: selectedSite,
        date_range: rumDateRange,
      };

      const cacheKey = getCacheKey(url, body);
      const cachedItem = cacheRef.current[cacheKey];

      // Return cached data if valid
      if (cachedItem && isCacheValid(cachedItem.timestamp)) {
        setActiveData(cachedItem.data.metrics || []);
        return;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data: any = await res.json();
        // Cache the response
        cacheRef.current[cacheKey] = {
          data,
          timestamp: Date.now(),
        };
        setActiveData(data.metrics || []);
      } else {
        setActiveData([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      setActiveData([]);
    }
  }

  // function toggleDescTrigger() {
  //   setDescTrigger((prev) => !prev);
  // }

  function getUpdatedMetrics(): MetricKey[] {
    if (!activeData || activeData.length === 0) return baseMetrics;

    return baseMetrics.map((metric) => {
      const key = metric.abbreviation?.toLowerCase();
      if (!key || key === "es") return metric;

      const percentileKey = `${key}_${rumDistribution}`;

      const values = activeData
        .filter(
          (entry) => entry.device_category === selectedDevice.toLowerCase()
        )
        .map((entry) => entry[percentileKey])
        .filter((val): val is number => typeof val === "number");

      const average =
        values.length > 0
          ? values.reduce((acc, val) => acc + val, 0) / values.length
          : null;

      return {
        ...metric,
        value: average,
        CruX: null,
      };
    });
  }

  // Fetch LCP analysis with caching
  async function get_lcp_analysis() {
    try {
      const url = "/api/rum/lcp";
      const body = {
        domain_name: selectedSite,
        date_range: "24hours",
      };

      const cacheKey = getCacheKey(url, body);
      const cachedItem = cacheRef.current[cacheKey];

      // Return cached data if valid
      if (cachedItem && isCacheValid(cachedItem.timestamp)) {
        set_lcp_analysis(cachedItem.data.metrics || []);
        return;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data: any = await res.json();
        // Cache the response
        cacheRef.current[cacheKey] = {
          data,
          timestamp: Date.now(),
        };
        set_lcp_analysis(data.metrics || []);
      } else {
        set_lcp_analysis([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      set_lcp_analysis([]);
    }
  }

  // Fetch CLS analysis with caching
  async function get_cls_analysis() {
    try {
      const url = "/api/rum/cls";
      const body = {
        domain_name: selectedSite,
        date_range: "24hours",
      };

      const cacheKey = getCacheKey(url, body);
      const cachedItem = cacheRef.current[cacheKey];

      // Return cached data if valid
      if (cachedItem && isCacheValid(cachedItem.timestamp)) {
        set_cls_analysis(cachedItem.data.metrics || []);
        return;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data: any = await res.json();
        // Cache the response
        cacheRef.current[cacheKey] = {
          data,
          timestamp: Date.now(),
        };
        set_cls_analysis(data.metrics || []);
      } else {
        set_cls_analysis([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      set_cls_analysis([]);
    }
  }

  // Fetch TTFB analysis with caching
  async function get_ttfb_analysis() {
    try {
      const url = "/api/rum/ttfb";
      const body = {
        domain_name: selectedSite,
        date_range: "24hours",
      };

      const cacheKey = getCacheKey(url, body);
      const cachedItem = cacheRef.current[cacheKey];

      // Return cached data if valid
      if (cachedItem && isCacheValid(cachedItem.timestamp)) {
        set_ttfb_analysis(cachedItem.data.metrics || []);
        return;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data: any = await res.json();
        // Cache the response
        cacheRef.current[cacheKey] = {
          data,
          timestamp: Date.now(),
        };
        set_ttfb_analysis(data.metrics || []);
      } else {
        set_ttfb_analysis([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      set_ttfb_analysis([]);
    }
  }

  // Fetch INP analysis with caching
  async function get_inp_analysis() {
    try {
      const url = "/api/rum/inp";
      const body = {
        domain_name: selectedSite,
        date_range: "7days",
      };

      const cacheKey = getCacheKey(url, body);
      const cachedItem = cacheRef.current[cacheKey];

      // Return cached data if valid
      if (cachedItem && isCacheValid(cachedItem.timestamp)) {
        set_inp_analysis(cachedItem.data.metrics || []);
        return;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data: any = await res.json();
        // Cache the response
        cacheRef.current[cacheKey] = {
          data,
          timestamp: Date.now(),
        };
        set_inp_analysis(data.metrics || []);
      } else {
        set_inp_analysis([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      set_inp_analysis([]);
    }
  }

  // Fetch FCP analysis with caching
  async function get_fcp_analysis() {
    try {
      const url = "/api/rum/fcp";
      const body = {
        domain_name: selectedSite,
        date_range: "24hours",
      };

      const cacheKey = getCacheKey(url, body);
      const cachedItem = cacheRef.current[cacheKey];

      // Return cached data if valid
      if (cachedItem && isCacheValid(cachedItem.timestamp)) {
        set_fcp_analysis(cachedItem.data.metrics || []);
        return;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data: any = await res.json();
        // Cache the response
        cacheRef.current[cacheKey] = {
          data,
          timestamp: Date.now(),
        };
        set_fcp_analysis(data.metrics || []);
      } else {
        set_fcp_analysis([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      set_fcp_analysis([]);
    }
  }

  function computeExperienceScore(metrics?: p75s[]): number {
    if (!metrics) return 0;

    let lcp_total = 0,
      cls_total = 0,
      fcp_total = 0,
      inp_total = 0,
      ttfb_total = 0;

    if (metrics.length > 0) {
      let lcp_count = 0,
        fcp_count = 0,
        inp_count = 0,
        ttfb_count = 0;

      for (let i = 0; i < metrics.length; i++) {
        cls_total += (metrics[i].cls ?? 0) / metrics.length;

        if ((metrics[i].lcp ?? 0) !== 0) {
          lcp_total += metrics[i].lcp ?? 0;
          lcp_count++;
        }
        if ((metrics[i].fcp ?? 0) !== 0) {
          fcp_total += metrics[i].fcp ?? 0;
          fcp_count++;
        }
        if ((metrics[i].inp ?? 0) !== 0) {
          inp_total += metrics[i].inp ?? 0;
          inp_count++;
        }
        if ((metrics[i].ttfb ?? 0) !== 0) {
          ttfb_total += metrics[i].ttfb ?? 0;
          ttfb_count++;
        }
      }

      if (lcp_count > 0) lcp_total /= lcp_count;
      if (fcp_count > 0) fcp_total /= fcp_count;
      if (inp_count > 0) inp_total /= inp_count;
      if (ttfb_count > 0) ttfb_total /= ttfb_count;
    }

    const weights = {
      lcp: 0.25,
      inp: 0.2,
      cls: 0.25,
      fcp: 0.1,
      ttfb: 0.2,
    };

    function getScore(value: number, range: number[]): number {
      if (value < range[0]) return 1;
      if (value >= range[1]) return 0;

      const normalized = (range[1] - value) / (range[1] - range[0]);
      return Math.pow(normalized, 2); // Penalize faster
    }
    console.log("INP average:", inp_total);
    console.log("INP score:", getScore(inp_total, cwv_ranges.inp));
    let totalScore = 0;

    if (lcp_total != null) {
      totalScore += getScore(lcp_total, cwv_ranges.lcp) * weights.lcp;
    }
    if (cls_total != null) {
      totalScore += getScore(cls_total, cwv_ranges.cls) * weights.cls;
    }
    if (inp_total != null) {
      totalScore += getScore(inp_total, cwv_ranges.inp) * weights.inp;
    }
    if (ttfb_total != null) {
      totalScore += getScore(ttfb_total, cwv_ranges.ttfb) * weights.ttfb;
    }
    if (fcp_total != null) {
      totalScore += getScore(fcp_total, cwv_ranges.fcp) * weights.fcp;
    }

    return Math.round(totalScore * 100);
  }
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 14;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative top-[-5px] w-13 h-13">
      <svg
        className="w-full h-full transform -rotate-90"
        viewBox="0 0 36 36"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-green-500 transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-primary">
        {score}%
      </span>
    </div>
  );
}
