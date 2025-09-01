"use client";

import dynamic from "next/dynamic";
import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import styles from "../helpers/tooltip.module.css";
import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import { alpha2ToAlpha3, alpha3ToAlpha2 } from "./countryCodes";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);

export type HappinessData = {
  collection_date: string;
  domain_name: string;
  device_type: "desktop" | "mobile" | "tablet" | "unknown";
  country: string;
  lcp_good_percentage: number;
  lcp_average_percentage: number;
  lcp_poor_percentage: number;
  inp_good_percentage: number;
  inp_average_percentage: number;
  inp_poor_percentage: number;
  cls_good_percentage: number;
  cls_average_percentage: number;
  cls_poor_percentage: number;
  ttfb_good_percentage: number;
  ttfb_average_percentage: number;
  ttfb_poor_percentage: number;
  fcp_good_percentage: number;
  fcp_average_percentage: number;
  fcp_poor_percentage: number;
  total_measurements: number;
};

type Props = {
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown" | "all";
  trafficData: HappinessData[];
};

export default function HappinessMap({ deviceType, trafficData }: Props) {
  const [geoJsonData, setGeoJsonData] =
    React.useState<FeatureCollection<Geometry> | null>(null);
  const { theme } = useTheme();

  console.log(trafficData);

  // Calculate user happiness and aggregate data by country
  const trafficByCountry: Record<
    string,
    {
      happiness: number;
      lcp: { good: number; average: number; poor: number };
      inp: { good: number; average: number; poor: number };
      cls: { good: number; average: number; poor: number };
      ttfb: { good: number; average: number; poor: number };
      total_measurements: number;
    }
  > = React.useMemo(() => {
    const filteredData =
      deviceType === "all"
        ? trafficData
        : trafficData.filter((entry) => entry.device_type === deviceType);

    const countryData: Record<
      string,
      {
        lcp_good: number;
        lcp_average: number;
        lcp_poor: number;
        inp_good: number;
        inp_average: number;
        inp_poor: number;
        cls_good: number;
        cls_average: number;
        cls_poor: number;
        ttfb_good: number;
        ttfb_average: number;
        ttfb_poor: number;
        total_measurements: number;
      }
    > = {};

    filteredData.forEach((entry) => {
      const alpha3 =
        alpha2ToAlpha3[entry.country.toUpperCase()] ||
        entry.country.toUpperCase();
      if (!countryData[alpha3]) {
        countryData[alpha3] = {
          lcp_good: 0,
          lcp_average: 0,
          lcp_poor: 0,
          inp_good: 0,
          inp_average: 0,
          inp_poor: 0,
          cls_good: 0,
          cls_average: 0,
          cls_poor: 0,
          ttfb_good: 0,
          ttfb_average: 0,
          ttfb_poor: 0,
          total_measurements: 0,
        };
      }

      const weight = entry.total_measurements;
      countryData[alpha3].lcp_good += entry.lcp_good_percentage * weight;
      countryData[alpha3].lcp_average += entry.lcp_average_percentage * weight;
      countryData[alpha3].lcp_poor += entry.lcp_poor_percentage * weight;
      countryData[alpha3].inp_good += entry.inp_good_percentage * weight;
      countryData[alpha3].inp_average += entry.inp_average_percentage * weight;
      countryData[alpha3].inp_poor += entry.inp_poor_percentage * weight;
      countryData[alpha3].cls_good += entry.cls_good_percentage * weight;
      countryData[alpha3].cls_average += entry.cls_average_percentage * weight;
      countryData[alpha3].cls_poor += entry.cls_poor_percentage * weight;
      countryData[alpha3].ttfb_good += entry.ttfb_good_percentage * weight;
      countryData[alpha3].ttfb_average +=
        entry.ttfb_average_percentage * weight;
      countryData[alpha3].ttfb_poor += entry.ttfb_poor_percentage * weight;
      countryData[alpha3].total_measurements += weight;
    });

    const aggregated: Record<
      string,
      {
        happiness: number;
        lcp: { good: number; average: number; poor: number };
        inp: { good: number; average: number; poor: number };
        cls: { good: number; average: number; poor: number };
        ttfb: { good: number; average: number; poor: number };
        total_measurements: number;
      }
    > = {};

    for (const [alpha3, data] of Object.entries(countryData)) {
      const total = data.total_measurements || 1; // Avoid division by zero
      const happiness =
        (data.lcp_good / total +
          data.inp_good / total +
          data.cls_good / total +
          data.ttfb_good / total) /
        4; // Equal weights for simplicity

      aggregated[alpha3] = {
        happiness,
        lcp: {
          good: data.lcp_good / total,
          average: data.lcp_average / total,
          poor: data.lcp_poor / total,
        },
        inp: {
          good: data.inp_good / total,
          average: data.inp_average / total,
          poor: data.inp_poor / total,
        },
        cls: {
          good: data.cls_good / total,
          average: data.cls_average / total,
          poor: data.cls_poor / total,
        },
        ttfb: {
          good: data.ttfb_good / total,
          average: data.ttfb_average / total,
          poor: data.ttfb_poor / total,
        },
        total_measurements: data.total_measurements,
      };
    }

    return aggregated;
  }, [deviceType, trafficData]);

  // Load GeoJSON
  React.useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch GeoJSON");
        return res.json();
      })
      .then((data: unknown) => {
        if (
          data &&
          typeof data === "object" &&
          "type" in data &&
          data.type === "FeatureCollection"
        ) {
          setGeoJsonData(
            data as FeatureCollection<Geometry, GeoJsonProperties>
          );
        } else {
          throw new Error("Invalid GeoJSON format");
        }
      })
      .catch((error) => {
        console.error("Error fetching GeoJSON:", error);
      });
  }, []);

  // Color scale for user happiness (0–100)
  const colors = ["#FF9898", "#FFEEA9", "#66cc8f"]; // Red (poor), Orange (average), Green (good)

  const getColor = (happiness: number) => {
    if (happiness >= 66) return colors[2]; // Green for good (66–100)
    if (happiness >= 33) return colors[1]; // Orange for average (33–65.9)
    return colors[0]; // Red for poor (0–32.9)
  };

  const style = (feature: any) => {
    const countryCode = feature.id?.toUpperCase(); // Alpha-3
    const happiness = trafficByCountry[countryCode]?.happiness || 0;

    return {
      fillColor: getColor(happiness),
      weight: 1,
      opacity: 1,
      color: theme === "dark" ? "#222" : "white",
      fillOpacity: 0.7,
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const countryCodeAlpha3 = feature.id?.toUpperCase(); // Alpha-3 code
    const countryName = feature.properties.name || "Unknown";
    const data = trafficByCountry[countryCodeAlpha3] || {
      happiness: 0,
      lcp: { good: 0, average: 0, poor: 0 },
      inp: { good: 0, average: 0, poor: 0 },
      cls: { good: 0, average: 0, poor: 0 },
      ttfb: { good: 0, average: 0, poor: 0 },
      total_measurements: 0,
    };

    const countryCodeAlpha2 = alpha3ToAlpha2[countryCodeAlpha3] || null;

    const flagImg = countryCodeAlpha2
      ? `<img
          src="https://flagcdn.com/w20/${countryCodeAlpha2}.png"
          alt="${countryName} flag"
          style="width:20px; height:14px; margin-right:8px; vertical-align:middle;"
          onerror="this.style.display='none'"
        />`
      : "";

    const tooltipContent = `
      <div class="${styles.tooltipContainer} z-50">
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          ${flagImg}
          <strong class="${styles.tooltipCountryName}">${countryName}</strong>
        </div>
        <div class="${styles.tooltipVisitors}">
          User Happiness: <span class="${
            styles.tooltipVisitorsStrong
          }">${data.happiness.toFixed(1)}%</span>
        </div>
        <div class="${styles.tooltipVisitors}">
          <strong>LCP:</strong> Good: ${data.lcp.good.toFixed(
            1
          )}%, Avg: ${data.lcp.average.toFixed(
      1
    )}%, Poor: ${data.lcp.poor.toFixed(1)}%
        </div>
        <div class="${styles.tooltipVisitors}">
          <strong>INP:</strong> Good: ${data.inp.good.toFixed(
            1
          )}%, Avg: ${data.inp.average.toFixed(
      1
    )}%, Poor: ${data.inp.poor.toFixed(1)}%
        </div>
        <div class="${styles.tooltipVisitors}">
          <strong>CLS:</strong> Good: ${data.cls.good.toFixed(
            1
          )}%, Avg: ${data.cls.average.toFixed(
      1
    )}%, Poor: ${data.cls.poor.toFixed(1)}%
        </div>
        <div class="${styles.tooltipVisitors}">
          <strong>TTFB:</strong> Good: ${data.ttfb.good.toFixed(
            1
          )}%, Avg: ${data.ttfb.average.toFixed(
      1
    )}%, Poor: ${data.ttfb.poor.toFixed(1)}%
        </div>
        <div class="${styles.tooltipVisitors}">
          Total Measurements: <span class="${styles.tooltipVisitorsStrong}">${
      data.total_measurements
    }</span>
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
    <div className="w-full h-[350px] bg-transparent relative z-0">
      <style>{`.leaflet-control-attribution { display: none !important; }`}</style>
      <MapContainer
        key={theme + deviceType}
        center={[40, 0]}
        zoom={1}
        dragging
        scrollWheelZoom={false}
        doubleClickZoom
        minZoom={1}
        zoomControl={false}
        attributionControl={false}
        style={{
          height: "100%",
          width: "100%",
          backgroundColor: theme === "dark" ? "#1b1b1b" : "#fff",
        }}
        className="z-0"
      >
        {geoJsonData && (
          <GeoJSON
            data={geoJsonData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}
