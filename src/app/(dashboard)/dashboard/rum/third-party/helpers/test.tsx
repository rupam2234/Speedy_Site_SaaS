import React from "react";
import { DomainData } from "./data";

interface Props {
  data: DomainData[];
}

export default function ThirdPartyImpactList({ data }: Props) {
  const filtered = data
    .filter((d) => d.performance !== "good")
    .sort((a, b) => b.averageDuration - a.averageDuration); // Sort by worst first

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No performance issues detected with third-party domains.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map((item, idx) => (
        <div
          key={item.domain + idx}
          className="p-4 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm"
        >
          <div className="flex justify-between items-center">
            <span className="font-medium text-primary">{item.domain}</span>
            <span
              className={`text-xs font-semibold px-2 py-1 rounded ${
                item.performance === "poor"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {item.performance.toUpperCase()}
            </span>
          </div>

          <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <p>
              Appearances: <strong>{item.count}</strong>
            </p>
            <p>
              Avg Duration: <strong>{item.averageDuration.toFixed(1)}ms</strong>
            </p>
            {item.averageTTFB > 0 && (
              <p>
                Avg TTFB: <strong>{item.averageTTFB.toFixed(1)}ms</strong>
              </p>
            )}
            {item.totalTransferSize > 0 && (
              <p>
                Transfer Size: <strong>{item.totalTransferSize} bytes</strong>
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
