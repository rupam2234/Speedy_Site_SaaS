import React from "react";

export type DevicePerformanceData = {
  domain?: string;
  device_type?: "desktop" | "mobile";
  total_sessions?: number;
  avg_citation_score: number;
  min_citation_score: number;
  max_citation_score: number;
  std_dev_citation_score: number;
  avg_ttfb: number;
  avg_dom_content_loaded: number;
  ai_citation_possibility: "Low" | "Medium" | "High";
};

const CitationStatsCard: React.FC<DevicePerformanceData> = ({
  avg_citation_score,
  min_citation_score,
  max_citation_score,
  std_dev_citation_score,
  avg_ttfb,
  avg_dom_content_loaded,
  ai_citation_possibility,
}) => {
  const getVisibilityColor = (level: string) => {
    switch (level) {
      case "high":
        return "text-green-600";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-red-500";
      default:
        return "";
    }
  };

  const citationPossibilityTooltip = {
    Low: "Page speed is not optimized enough; low chance AI cites this page.",
    Medium:
      "Moderate optimization; some chance AI references this page assuming the page has great content.",
    High: "Excellent page speed; the page is performance ready for AI citation.",
  };

  return (
    <div className="p-4 rounded-sm border bg-white border-accent-foreground/20 dark:bg-secondary-background space-y-3 relative">
      {/* Tooltip icon top right */}
      <div className="absolute top-4 right-4 group cursor-pointer">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-label="Info tooltip"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
          />
        </svg>
        <div className="absolute z-10 hidden w-64 p-2 text-xs text-white bg-gray-700 rounded shadow-md group-hover:block right-full top-1/2 transform -translate-y-1/2 mr-2">
          The AI Citation score shows how ready your page speed is to be cited
          by AI. Higher scores mean your site loads fast enough & has proper
          HTML markups (excluding high content quality) to be favored or
          referenced by AI algorithms.
        </div>
      </div>

      {/* Score big number */}
      <div className="text-4xl font-bold text-blue-600">
        {Math.round(avg_citation_score)}
        <span className="text-base font-normal text-gray-500"> / 100</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 text-sm gap-y-1">
        <div>📊 Std Dev:</div> <div>{std_dev_citation_score}</div>
        <div>🔼 Max:</div> <div>{max_citation_score}</div>
        <div>🔽 Min:</div> <div>{min_citation_score}</div>
      </div>

      {/* TTFB and DOM Load bars */}
      <div className="text-sm mt-2">
        <div className="mb-1">⚡ Avg TTFB:</div>
        <div className="w-full bg-gray-200 h-2 rounded">
          <div
            className="bg-blue-500 h-2 rounded"
            style={{ width: `${Math.min(avg_ttfb / 20, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs mt-1">{avg_ttfb.toFixed(2)} ms</div>

        <div className="mt-2 mb-1">📦 DOM Load:</div>
        <div className="w-full bg-gray-200 h-2 rounded">
          <div
            className="bg-purple-500 h-2 rounded"
            style={{ width: `${Math.min(avg_dom_content_loaded / 20, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs mt-1">
          {avg_dom_content_loaded.toFixed(2)} ms
        </div>
      </div>

      {/* AI Citation Possibility with tooltip */}
      <div className="mt-3 text-sm flex items-center gap-1">
        👁️ AI Citation Possibility:{" "}
        <div className="relative group cursor-pointer">
          <span
            className={`${getVisibilityColor(
              ai_citation_possibility
            )} font-semibold`}
          >
            {ai_citation_possibility.toUpperCase()}
          </span>
          <div className="absolute z-10 hidden w-64 p-2 text-xs text-white bg-gray-700 rounded shadow-md group-hover:block -top-16 left-1/2 transform -translate-x-1/2 whitespace-normal">
            {citationPossibilityTooltip[ai_citation_possibility]}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitationStatsCard;
