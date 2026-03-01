"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useTheme } from "@/components/theme/ThemeProvider";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), {
  ssr: false,
});

type Props = {
  geoJsonData: any;
  styleFn: any;
  onEachFeatureFn: any;
};

export default function TrafficMap({
  geoJsonData,
  styleFn,
  onEachFeatureFn,
}: Props) {
  const { theme } = useTheme();

  return (
    <div className="w-full h-87.5 bg-transparent relative z-0">
      <style>{`.leaflet-control-attribution { display: none !important; }`}</style>
      <MapContainer
        // key={geoJsonData ? JSON.stringify(geoJsonData) : "map"}
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
      >
        {geoJsonData && (
          <GeoJSON
            data={geoJsonData}
            style={styleFn}
            onEachFeature={onEachFeatureFn}
          />
        )}
      </MapContainer>
    </div>
  );
}
