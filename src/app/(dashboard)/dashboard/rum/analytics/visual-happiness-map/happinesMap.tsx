import { useSiteContext } from "../../../siteContext";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo } from "react";
import { FeatureCollection, Geometry } from "geojson";
import { alpha3ToAlpha2 } from "../visual-traffic-map/countryCodes";
import styles from "../visual-traffic-map/tooltip.module.css";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Frown, Info, Meh, Smile } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import TooltipIcon from "@/components/theme/customTooltip";

const ClientMap = dynamic(() => import("../helpers/trafficMap"), {
  ssr: false,
});

interface UserHappinessMapProps {
  happinessData: any[]; // will update any
}

export default function UserHappinessMap({
  happinessData,
}: UserHappinessMapProps) {
  const { selectedDevice } = useSiteContext();
  const { theme } = useTheme();

  const [geoJsonData, setGeoJsonData] =
    React.useState<FeatureCollection<Geometry> | null>(null);

  // filter the data based on device type
  const happinessDataByDevice = useMemo(() => {
    if (!selectedDevice) return [];

    if (selectedDevice !== "All") {
      return happinessData.filter(
        (x) => x.device_type === selectedDevice.toLowerCase(),
      );
    }

    // "all": combine desktop + mobile + tablet per country
    const grouped: Record<
      string,
      {
        happy: number;
        moderate: number;
        unhappy: number;
        count: number;
      }
    > = {};

    for (const row of happinessData) {
      const country = row.country_iso;
      if (!country) continue;

      if (!grouped[country]) {
        grouped[country] = {
          happy: 0,
          moderate: 0,
          unhappy: 0,
          count: 0,
        };
      }

      grouped[country].happy += row.happy_percentage ?? 0;
      grouped[country].moderate += row.moderate_percentage ?? 0;
      grouped[country].unhappy += row.unhappy_percentage ?? 0;
      grouped[country].count += 1;
    }

    return Object.entries(grouped).map(([country_iso, values]) => ({
      country_iso,
      happy_percentage: Math.round(values.happy / values.count),
      moderate_percentage: Math.round(values.moderate / values.count),
      unhappy_percentage: Math.round(values.unhappy / values.count),
      device_type: "all",
    }));
  }, [selectedDevice, happinessData]);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json",
    )
      .then((r) => r.json())
      .then((data: any) => setGeoJsonData(data))
      .catch((e) => console.error(e));
  }, []);

  return (
    <>
      <ClientMap
        key={selectedDevice + theme}
        geoJsonData={geoJsonData}
        styleFn={style}
        onEachFeatureFn={onEachFeature}
      />
      <div
        style={{
          marginTop: "25px",
          display: "flex",
          gap: "20px",
          alignItems: "center",
          fontSize: "12px",
        }}
        className="text-primary/80 justify-between"
      >
        <div className="flex gap-3 items-center">
          <div>
            Good UX:
            <span className="px-3.5 ml-2 rounded-lg bg-green-400" />
          </div>
          <div>
            Average UX:
            <span className="px-3.5 ml-2 rounded-lg bg-yellow-400" />
          </div>
          <div>
            Poor UX: <span className="px-3.5 ml-2 rounded-lg bg-red-400" />
          </div>
        </div>
        <TooltipIcon
          content={
            "Performance differences across regions are most often driven by the physical distance between users and servers. If you’re seeing noticeable UX degradation, it’s a strong signal that a CDN should be introduced if one isn’t already in place."
          }
          trigger={
            <Info
              size={22}
              className="text-primary/80 hover:bg-primary/10 p-1 rounded-full cursor-pointer"
            />
          }
        />
      </div>
    </>
  );

  function style(feature: any) {
    const countryCode = alpha3ToAlpha2[feature.id]?.toUpperCase();
    const countryUxData = happinessDataByDevice.find(
      (x) => x.country_iso === countryCode,
    );

    const percentages = countryUxData
      ? [
          countryUxData.happy_percentage,
          countryUxData.moderate_percentage,
          countryUxData.unhappy_percentage,
        ]
      : [0, 0, 0];

    return {
      fillColor: getColor(percentages),
      weight: 1,
      opacity: 1,
      color: theme === "dark" ? "#222" : "white",
      fillOpacity: 0.7,
    };
  }

  function getColor(percentages: number[]) {
    // colors for UX
    const colors = ["#6be65f", "#f4e66b", "#f49e99"]; // green, orange, red

    let maxValue = 0;
    let maxIndex = 0;

    for (let i = 0; i < percentages.length; i++) {
      if (percentages[i] > maxValue) {
        maxValue = percentages[i];
        maxIndex = i;
      }
    }

    // for 0 max return gray colour
    if (maxValue === 0) {
      return "#dfdfdf";
    }

    return colors[maxIndex];
  }

  function onEachFeature(feature: any, layer: any) {
    const countryCodeAlpha3 = feature.id?.toUpperCase();
    const countryName = feature.properties.name || "Unknown";

    const countryCode =
      alpha3ToAlpha2[countryCodeAlpha3]?.toUpperCase() || null;

    const uxData = happinessDataByDevice.find(
      (x) => x.country_iso === countryCode,
    );

    const tooltipContent = renderToStaticMarkup(
      <div className={styles.tooltipContainer}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          {countryCodeAlpha3 && (
            <img
              src={`https://flagcdn.com/w20/${countryCode?.toLowerCase()}.png`}
              alt={`${countryName} flag`}
              style={{ width: 20, height: 14, marginRight: 8 }}
            />
          )}
          <strong className={styles.tooltipCountryName}>{countryName}</strong>
        </div>
        <div
          className={styles.tooltipVisitors}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <Smile size={16} className="fill-green-400 text-white" />
            <span className={styles.tooltipVisitorsStrong}>
              {uxData && uxData.happy_percentage}%
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <Meh size={16} className="fill-yellow-400 text-white" />
            <span className={styles.tooltipVisitorsStrong}>
              {uxData && uxData.moderate_percentage}%
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <Frown size={16} className="fill-red-400 text-white" />
            <span className={styles.tooltipVisitorsStrong}>
              {uxData && uxData.unhappy_percentage}%
            </span>
          </div>
        </div>
      </div>,
    );

    layer.bindTooltip(tooltipContent, {
      sticky: true,
      direction: "auto",
      opacity: 0.95,
    });
  }
}
