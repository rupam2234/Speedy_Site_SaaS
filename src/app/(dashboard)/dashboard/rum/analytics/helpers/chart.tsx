"use client";

import dynamic from "next/dynamic";
import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import styles from "../helpers/tooltip.module.css";
import "leaflet/dist/leaflet.css";
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

  // Convert traffic data to Alpha-3 keyed record
  const trafficByCountry: Record<string, number> = React.useMemo(() => {
    let found;

    if (Array.isArray(trafficData)) {
      found = trafficData?.find((entry) => entry.device_type === deviceType);
    }
    if (!found?.country_distribution) return {};

    try {
      const original = JSON.parse(found.country_distribution) as Record<
        string,
        number
      >;
      const converted: Record<string, number> = {};

      for (const [alpha2, count] of Object.entries(original)) {
        const alpha3 = alpha2ToAlpha3[alpha2.toUpperCase()];
        if (alpha3) {
          converted[alpha3] = count;
        }
      }

      return converted;
    } catch (error) {
      console.error("Invalid data in country_distribution:", error);
      return {};
    }
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

  // Color scale
  const colors = ["#2c7bb6", "#00ccbc", "#90eb9d", "#f29e2e", "#e76818"];

  const getColor = (count: number) => {
    if (count > 100) return colors[4];
    if (count > 50) return colors[3];
    if (count > 20) return colors[2];
    if (count > 0) return colors[1];
    return colors[0];
  };

  const style = (feature: any) => {
    const countryCode = feature.id?.toUpperCase(); // Alpha-3
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
    const countryCodeAlpha3 = feature.id?.toUpperCase(); // Alpha-3 code
    const countryName = feature.properties.name || "Unknown";
    const count = trafficByCountry[countryCodeAlpha3] || 0;

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
