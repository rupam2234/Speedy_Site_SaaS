"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/components/theme/ThemeProvider";
import styles from "../helpers/tooltip.module.css";
import type { FeatureCollection, Geometry } from "geojson";
import { alpha2ToAlpha3, alpha3ToAlpha2 } from "..";

const ClientMap = dynamic(() => import("../helpers/trafficMap"), {
  ssr: false,
});

type TrafficEntry = {
  device_type: "desktop" | "mobile" | "tablet" | "all";
  country_distribution: string;
};

type Props = {
  deviceType?: "desktop" | "mobile" | "tablet" | "all";
  trafficData: TrafficEntry[];
};

export default function CountryTrafficMap({ deviceType, trafficData }: Props) {
  const [geoJsonData, setGeoJsonData] =
    React.useState<FeatureCollection<Geometry> | null>(null);
  const { theme } = useTheme();

  const trafficByCountry: Record<string, number> = React.useMemo(() => {
    const found = Array.isArray(trafficData)
      ? trafficData?.find((entry) => entry.device_type === deviceType)
      : null;

    if (!found?.country_distribution) return {};

    try {
      const original = JSON.parse(found.country_distribution) as Record<
        string,
        number
      >;
      const converted: Record<string, number> = {};
      for (const [alpha2, count] of Object.entries(original)) {
        const alpha3 = alpha2ToAlpha3[alpha2.toUpperCase()];
        if (alpha3) converted[alpha3] = count;
      }

      return converted;
    } catch {
      return {};
    }
  }, [deviceType, trafficData]);

  const trafficByCountryArray = Object.entries(trafficByCountry).map(
    ([code, traffic]) => ({ code, traffic }),
  );

  console.log(trafficByCountryArray);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json",
    )
      .then((r) => r.json())
      .then((data: any) => setGeoJsonData(data))
      .catch((e) => console.error(e));
  }, []);

  const colors = ["#2c7bb6", "#00ccbc", "#90eb9d", "#f29e2e", "#e76818"];
  const getColor = (count: number) =>
    count > 100
      ? colors[4]
      : count > 50
        ? colors[3]
        : count > 20
          ? colors[2]
          : count > 0
            ? colors[1]
            : colors[0];

  const style = (feature: any) => {
    const countryCode = feature.id?.toUpperCase();
    const count = trafficByCountry[countryCode] || 0;
    return {
      fillColor: getColor(count),
      weight: 1,
      opacity: 1,
      color: theme === "dark" ? "#222" : "white",
      fillOpacity: 0.7,
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const countryCodeAlpha3 = feature.id?.toUpperCase();
    const countryName = feature.properties.name || "Unknown";
    const count = trafficByCountry[countryCodeAlpha3] || 0;
    const countryCodeAlpha2 = alpha3ToAlpha2[countryCodeAlpha3] || null;
    const flagImg = countryCodeAlpha2
      ? `<img src="https://flagcdn.com/w20/${countryCodeAlpha2}.png"
          alt="${countryName} flag"
          style="width:20px; height:14px; margin-right:8px; vertical-align:middle;"
          onerror="this.style.display='none'" />`
      : "";

    const tooltipContent = `
      <div class="${styles.tooltipContainer}">
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          ${flagImg}
          <strong class="${styles.tooltipCountryName}">${countryName}</strong>
        </div>
        <div class="${styles.tooltipVisitors}">
          Visitors: <span class="${styles.tooltipVisitorsStrong}">${count}</span>
        </div>
      </div>
    `;
    layer.bindTooltip(tooltipContent, {
      sticky: true,
      direction: "auto",
      opacity: 0.95,
    });
  };

  return (
    <>
      {trafficData && trafficData.length > 0 ? (
        <>
          <ClientMap
            key={theme}
            geoJsonData={geoJsonData}
            styleFn={style}
            onEachFeatureFn={onEachFeature}
            theme={theme}
          />
          <div className="mt-2">Display a scrolling stripe</div>
        </>
      ) : (
        <></>
      )}
    </>
  );
}
