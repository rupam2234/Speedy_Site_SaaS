"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useSiteContext } from "../../siteContext";
import {
  InfoIcon,
  Type,
  Monitor,
  Smartphone,
  HelpCircle,
  Tablet,
} from "lucide-react";
import TooltipIcon from "@/components/theme/customTooltip";
import { LoadingAnimation, PrimaryToolbar } from "@/components/theme";
import { cachedData, cleanExpiredCache } from "@/components/utils";

interface FontMetric {
  device_type: string;
  font_family: string;
  font_weight: string;
  sample_count: number;
  avg_lcp_ms: number;
  avg_render_delay_ms: number;
  avg_font_load_ms: number;
  poor_lcp_pct: number;
}

export default function FontAnalysis() {
  const { selectedSite, selectedDevice } = useSiteContext();
  const [fontData, setFontData] = useState<FontMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const lastFetched = useRef<string | null>(null);

  useEffect(() => {
    cleanExpiredCache({ prefix: "font-analysis", session_Storage: false });
    if (selectedSite && lastFetched.current !== selectedSite) {
      fetchData();
      lastFetched.current = selectedSite;
    }
  }, [selectedSite]);

  const filteredFonts = useMemo(() => {
    if (!fontData) return [];
    return fontData
      .filter(
        (f) =>
          !selectedDevice ||
          selectedDevice === "All" ||
          f.device_type.toLowerCase() === selectedDevice.toLowerCase(),
      )
      .sort((a, b) => b.avg_render_delay_ms - a.avg_render_delay_ms); // Sort by biggest bottleneck
  }, [fontData, selectedDevice]);

  async function fetchData() {
    setLoading(true);
    const { response } = await cachedData({
      fn: async () => {
        const res = await fetch("/api/rum/fonts/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: selectedSite }),
        });
        const body: any = await res.json();
        return body.data;
      },
      key: `font-analysis:${selectedSite}`,
      session_Storage: false,
      ttl: 5 * 60 * 1000,
    });
    if (response) setFontData(response);
    setLoading(false);
  }

  if (!selectedSite || loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <div className="px-5 py-4 flex flex-col md:flex-row justify-between items-center">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-2xl tracking-tight bg-linear-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
              Font Diagnostics
            </h2>
            <TooltipIcon
              content="Analyzes how specific fonts impact Largest Contentful Paint (LCP) and visual stability."
              trigger={
                <InfoIcon
                  size={18}
                  className="rounded-full cursor-pointer text-primary/30 hover:text-primary transition-colors"
                />
              }
              side="right"
            />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-70">
            WEBFONT LOADING & RENDER IMPACT
          </p>
        </div>
      </div>

      <PrimaryToolbar
        defaultDateRange={7}
        enableDistribution={false}
        isSticky={true}
        enableAllDevices={true}
        disableCalender={true}
      />

      <div className="text-primary mt-4">
        <div className="w-full">
          {filteredFonts.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-primary/40 border-b border-primary/10">
                  <th className="py-3 px-6 font-bold">Font Family</th>
                  <th className="py-3 px-4 font-bold text-center">Device</th>
                  <th className="py-3 px-4 font-bold text-center">
                    Avg. LCP / Samples
                  </th>
                  <th className="py-3 px-4 font-bold text-center">
                    <div className="flex items-center justify-center gap-1">
                      Render Delay
                      <TooltipIcon
                        content="Time the browser waited for the font before painting text. High values cause 'invisible text'."
                        trigger={<HelpCircle size={10} />}
                      />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-center">Load Time</th>
                  <th className="py-3 px-6 font-bold text-right">
                    LCP Involvement
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {filteredFonts.map((font, idx) => (
                  <tr
                    key={idx}
                    className="group hover:bg-primary/3 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/5 rounded-md">
                          <Type size={16} className="text-primary/60" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            {font.font_family}
                          </span>
                          <span className="text-[10px] opacity-40 font-mono">
                            Weight: {font.font_weight}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center">
                        {font.device_type === "mobile" ? (
                          <Smartphone size={14} className="opacity-40" />
                        ) : font.device_type === "desktop" ? (
                          <Monitor size={14} className="opacity-40" />
                        ) : (
                          <Tablet size={14} className="opacity-40 rotate-90" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-xs italic">
                      {(font.avg_lcp_ms / 1000).toFixed(2)}s /{" "}
                      {font.sample_count}
                    </td>
                    <MetricCell value={font.avg_render_delay_ms} type="delay" />
                    <MetricCell value={font.avg_font_load_ms} type="load" />
                    <td className="py-4 px-6 text-right">
                      <ScoreBadge percentage={font.poor_lcp_pct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center opacity-30 text-sm italic font-medium">
              No font data detected for this selection.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Custom Metric Cell for Font stats
 */
function MetricCell({
  value,
  type,
}: {
  value: number;
  type: "delay" | "load";
}) {
  const getStyle = () => {
    if (type === "delay") {
      return value > 100
        ? "text-red-500"
        : value > 50
          ? "text-yellow-500"
          : "text-green-500";
    }
    return value > 400
      ? "text-red-500"
      : value > 200
        ? "text-yellow-500"
        : "text-green-500";
  };

  return (
    <td
      className={`py-4 px-4 text-center font-mono text-xs font-bold ${getStyle()}`}
    >
      {Math.round(value)}ms
    </td>
  );
}

/**
 * Score Badge for Poor LCP Impact
 */
function ScoreBadge({ percentage }: { percentage: number }) {
  return (
    <div className="text-[12px] text-primary italic">{percentage}% Poor</div>
  );
}
