"use client";

import { FontMetrics } from "@/app/api";
import { LoadingAnimation, PrimaryToolbar, Title } from "@/components/theme";
import { cachedData } from "@/components/utils";
import { useEffect, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { CachePrefix } from "@/data-types";

export function FontMain() {
  const { selectedSite } = useSiteContext();

  const [fontData, setFontData] = useState<FontMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchFontAnalysis();
  }, [selectedSite]);

  console.log(fontData);

  if (!selectedSite || loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="px-5">
          <Title
            title="Font Diagnostics"
            description="WEBFONT LOADING & RENDER IMPACT"
            tooltip={"Font loading "}
          />
        </div>
        <div className="flex items-center gap-4">
          <div>Hi</div>
          <PrimaryToolbar
            defaultDateRange={7}
            enableDistribution={false}
            isSticky={true}
            enableAllDevices={false}
            disableCalender={true}
            padding_x={"px-0"}
          />
        </div>
      </div>
    </>
  );

  async function fetchFontAnalysis() {
    if (loading) return;

    try {
      setLoading(true);

      const { response } = await cachedData({
        fn: async () => {
          const res = await fetch("/api/rum/fonts/analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain: selectedSite }),
          });

          if (!res.ok) {
            const errorMessage: any = await res.json();
            new Error(errorMessage ?? "Error fetching font analysis");
          }

          const body: any = await res.json();
          return body;
        },
        key: `${CachePrefix["FONT-ANALYSIS"]}:${selectedSite}`,
        session_Storage: false,
        ttl: 5 * 60 * 1000,
      });

      if (response) setFontData(response?.data);
    } catch (error: any) {
      console.error(error.message ?? "Error fetching font analysis");
    } finally {
      setLoading(false);
    }
  }
}
