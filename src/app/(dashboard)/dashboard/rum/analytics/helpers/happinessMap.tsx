"use client";

import React, { ReactNode } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import ReactDOMServer from "react-dom/server";
import { MapContainer, GeoJSON } from "react-leaflet";
import { alpha2ToAlpha3, alpha3ToAlpha2 } from "..";

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
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json",
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
            data as FeatureCollection<Geometry, GeoJsonProperties>,
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
    const countryCodeAlpha3 = feature.id?.toUpperCase();
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

    const tooltipDesign: ReactNode = (
      <div className="z-50 overflow-visible min-w-[180px] text-primary dark:text-black">
        <div className="flex items-center gap-2">
          <img
            fetchPriority="auto"
            src={`https://flagcdn.com/w20/${countryCodeAlpha2}.png`}
            alt={"country_name"}
            width={20}
            height={14}
          />
          <span className="font-semibold">{countryName}</span>
        </div>
        <div className="text-[13px] text-primary/80 dark:text-black">
          <div className="flex items-center gap-1">
            Experience Quality Score: <span>{Math.round(data.happiness)}</span>
          </div>
          <div className="mt-3.5">
            <VitalsBar
              label="LCP"
              good={data.lcp.good}
              average={data.lcp.average}
              poor={data.lcp.poor}
            />
            <VitalsBar
              label="INP"
              good={data.inp.good}
              average={data.inp.average}
              poor={data.inp.poor}
            />
            <VitalsBar
              label="CLS"
              good={data.cls.good}
              average={data.cls.average}
              poor={data.cls.poor}
            />
            <VitalsBar
              label="TTFB"
              good={data.ttfb.good}
              average={data.ttfb.average}
              poor={data.ttfb.poor}
            />
          </div>
        </div>
      </div>
    );

    layer.bindTooltip(ReactDOMServer.renderToString(tooltipDesign), {
      sticky: true,
      direction: "auto",
      opacity: 0.95,
    });
  };

  return (
    <div className="w-full h-[350px] bg-transparent relative z-0 overflow-visible">
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

function VitalsBar({ label, good, average, poor }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 font-semibold text-primary/80 dark:text-black/80">
        <span>{label}:</span>
        <span>Good: {Math.round(good)}%</span>
        <span>Avg: {Math.round(average)}%</span>
        <span>Poor: {Math.round(poor)}%</span>
      </div>
      <div className="w-[220px] h-2.5 rounded bg-gray-300 overflow-hidden flex border border-gray-300">
        <div
          style={{ width: `${good}%` }}
          className="bg-green-500"
          title={`Good: ${good.toFixed(1)}%`}
        />
        <div
          style={{ width: `${average}%` }}
          className="bg-yellow-400"
          title={`Average: ${average.toFixed(1)}%`}
        />
        <div
          style={{ width: `${poor}%` }}
          className="bg-red-500"
          title={`Poor: ${poor.toFixed(1)}%`}
        />
      </div>
    </div>
  );
}
