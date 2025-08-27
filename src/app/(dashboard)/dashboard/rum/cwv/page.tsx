"use client";

import { ReactNode, useEffect, useState } from "react";
import DashboardToolbar from "@/components/utils/toolbar";
import { useSiteContext } from "../../siteContext";
import Link from "next/link";
import RumCwvChart from "../helpers/webvitalscharts";
import { ArrowLeftSquare, ArrowRightSquare } from "lucide-react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import LCPBreakdownChart from "../helpers/lcpBreakDown";

interface MetricKey {
  name: string;
  score?: number | null;
  value?: number | null;
  CruX?: number | null;
  abbreviation?: "LCP" | "CLS" | "INP" | "TTFB" | "FCP" | "ES";
  desc?: ReactNode;
  impact?: ReactNode;
}

const baseMetrics: MetricKey[] = [
  {
    name: "User Experience Score",
    abbreviation: "ES",
    score: 80,
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
            Supports higher engagement and retention by reducing the “blank
            screen” delay during navigation.
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
  const [descTrigger, setDescTrigger] = useState<boolean>(true);
  const [lcp_analysis, set_lcp_analysis] = useState<any>();

  useEffect(() => {
    if (selectedSite) {
      get_rum_vitals();
    }
  }, [selectedSite, rumDateRange]);

  useEffect(() => {
    if (selectedSite && activeMetric.abbreviation === "LCP") {
      get_lcp_analysis();
    }
  }, [selectedSite, activeMetric, rumDateRange]);

  const displayMetrics = getUpdatedMetrics();

  // Update active metric value if activeMetric changes
  useEffect(() => {
    const updated = displayMetrics.find((m) => m.name === activeMetric.name);
    if (updated) setActiveMetric(updated);
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
                <p className="text-sm font-medium text-primary/80">{x.name}</p>

                <div className="flex items-center gap-4">
                  {x.name === "User Experience Score" && x.score !== null && (
                    <ScoreCircle score={x.score!} />
                  )}

                  {x.name !== "User Experience Score" && (
                    <div className="flex space-y-1 flex-col text-xs text-gray-600 dark:text-primary w-full">
                      <span className="font-medium">
                        Value: {x.value?.toFixed(2) ?? "—"}
                        {x.abbreviation === "CLS" ? "" : " ms"}
                      </span>

                      {typeof x.CruX === "number" && (
                        <span className="flex items-center gap-1">
                          CrUX: {x.CruX} ms
                          <span
                            className={
                              x.value! < x.CruX
                                ? "text-green-500"
                                : x.value! > x.CruX
                                ? "text-red-500"
                                : "text-gray-400"
                            }
                          >
                            ({x.value! < x.CruX ? "▲" : "▼"}{" "}
                            {Math.abs((x.value ?? 0) - (x.CruX ?? 0))} ms)
                          </span>
                        </span>
                      )}
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
                    let color = "bg-red-500";
                    if (value < good) color = "bg-green-500";
                    else if (value < poor) color = "bg-yellow-500";

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
            {!descTrigger && (
              <ArrowRightSquare
                size={22}
                className="absolute left-68 top-1 z-10 text-primary/70 dark:text-primary/90 p-[2px] hover:bg-primary/5 cursor-pointer"
                onClick={toggleDescTrigger}
              />
            )}

            {/* Description Panel */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                descTrigger
                  ? "w-full md:w-[32%] opacity-100"
                  : "hidden w-0 opacity-0"
              }`}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-primary/70">
                  {activeMetric.name}
                </h2>
                <ArrowLeftSquare
                  className="text-primary/70 md:block hidden dark:text-primary/90 p-[2px] cursor-pointer hover:bg-primary/5"
                  size={22}
                  onClick={toggleDescTrigger}
                />
              </div>

              <p className="font-semibold pb-3 mb-6 border-b border-primary/10">
                <span className="font-normal text-primary/70">Aggregate: </span>
                <span
                  className={(() => {
                    const key =
                      activeMetric.abbreviation?.toLowerCase() as keyof typeof cwv_ranges;
                    const range = cwv_ranges[key];
                    if (!range || activeMetric.value == null) return "";
                    if (activeMetric.value < range[0]) return "text-green-500";
                    if (activeMetric.value < range[1]) return "text-yellow-500";
                    return "text-red-500";
                  })()}
                >
                  {activeMetric.value?.toFixed(2) ?? "—"}
                </span>{" "}
                <span className="text-primary/40">
                  {activeMetric.abbreviation !== "CLS" &&
                  activeMetric.name !== "Experience Score"
                    ? " ms"
                    : ""}
                </span>
              </p>

              <div className="text-sm text-primary/80">{activeMetric.desc}</div>

              <div className="text-primary/70 mt-4 space-y-3">
                <p className="text-sm underline">Business Impact:</p>
                <>{activeMetric.impact}</>
              </div>
            </div>

            {/* Main Chart Area */}
            <div
              className={`transition-all duration-300 ease-in-out ${
                descTrigger ? "w-full md:w-[68%]" : "w-full"
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
              <div>
                <LCPBreakdownChart data={lcp_analysis || []} />
              </div>
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // Fetch RUM vitals
  async function get_rum_vitals() {
    try {
      const res = await fetch("/api/rum/rum-web-vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: rumDateRange,
        }),
      });

      if (res.ok) {
        const data: any = await res.json();
        // Expect: [{ key: 'lcp', latest: 1234, previous: 1250 }, ...]
        setActiveData(data.metrics || []);
      } else {
        setActiveData([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      setActiveData([]);
    }
  }

  function toggleDescTrigger() {
    setDescTrigger((prev) => !prev);
  }

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

  async function get_lcp_analysis() {
    try {
      const res = await fetch("/api/rum/lcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: "24hours",
        }),
      });

      if (res.ok) {
        const data: any = await res.json();
        set_lcp_analysis(data.metrics || []);
      } else {
        set_lcp_analysis([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      set_lcp_analysis([]);
    }
  }
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 14;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-10 h-10">
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
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-primary/80">
        {score}%
      </span>
    </div>
  );
}
