"use client";

import React, { useMemo, useState } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import BeatLoader from "react-spinners/BeatLoader";
import { Timer, Zap, Layers, CheckCircle, AlertTriangle } from "lucide-react";

interface FCPData {
  device_type: string;
  connection_type: string;
  occurrence_count: number;
  avg_fcp_value: number;
  min_fcp_value: number;
  max_fcp_value: number;
  p75_fcp_value: number;
  p90_fcp_value: number;
  p95_fcp_value: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}

interface Props {
  data: FCPData[];
}

const SORT_OPTIONS = [
  { label: "Average FCP", value: "avg_fcp_value" },
  { label: "P75", value: "p75_fcp_value" },
  { label: "P90", value: "p90_fcp_value" },
  { label: "P95", value: "p95_fcp_value" },
];

// Define a critical path analysis interface
interface CriticalPathAnalysis {
  title: string;
  description: string;
  bottlenecks: string[];
  optimizations: string[];
  implementation: string;
  expectedImprovement: string;
  verification: string;
}

// Function to get specific critical path analysis based on FCP value and connection type
const getCriticalPathAnalysis = (
  fcp: number,
  connectionType: string
): CriticalPathAnalysis => {
  const isSlowConnection =
    connectionType.toLowerCase().includes("2g") ||
    connectionType.toLowerCase().includes("3g") ||
    connectionType.toLowerCase().includes("slow");

  if (fcp > 3000) {
    return {
      title: "Severe Rendering Delay",
      description:
        "First Contentful Paint is taking too long, indicating significant bottlenecks in the critical rendering path.",
      bottlenecks: [
        "Large render-blocking resources",
        "Excessive server response time",
        "Unoptimized images or media",
        "Inefficient caching strategy",
      ],
      optimizations: [
        "Eliminate render-blocking resources",
        "Optimize server response time",
        "Compress and optimize images",
        "Implement aggressive caching",
      ],
      implementation:
        "Identify and prioritize critical resources, then optimize their delivery and loading.",
      expectedImprovement:
        "FCP should improve by 40-60% with proper optimization.",
      verification:
        "Measure FCP before and after changes using Chrome DevTools or WebPageTest.",
    };
  }

  if (fcp > 1800) {
    return {
      title: "Moderate Rendering Delay",
      description:
        "First Contentful Paint is slower than ideal, indicating room for improvement in the critical rendering path.",
      bottlenecks: [
        "Some render-blocking CSS or JavaScript",
        "Moderately large images",
        "Suboptimal server response time",
      ],
      optimizations: [
        "Reduce render-blocking resources",
        "Optimize images and media",
        "Improve server response time",
      ],
      implementation:
        "Focus on the most impactful optimizations for the critical rendering path.",
      expectedImprovement:
        "FCP should improve by 20-40% with targeted optimizations.",
      verification:
        "Test FCP improvements using real user monitoring (RUM) or synthetic testing.",
    };
  }

  if (isSlowConnection && fcp > 1000) {
    return {
      title: "Slow Network Performance",
      description:
        "FCP is particularly slow on this connection type, indicating poor performance optimization for challenging network conditions.",
      bottlenecks: [
        "Large resource sizes not suitable for slow networks",
        "Too many requests causing network congestion",
        "Lack of adaptive loading strategies",
      ],
      optimizations: [
        "Implement responsive images and adaptive loading",
        "Reduce total page weight",
        "Use resource hints to optimize loading order",
      ],
      implementation:
        "Optimize for slow networks by reducing resource sizes and implementing adaptive loading strategies.",
      expectedImprovement:
        "FCP should improve by 30-50% on slow connections with proper optimization.",
      verification: "Test on slow network emulations to verify improvements.",
    };
  }

  return {
    title: "Good Rendering Performance",
    description:
      "First Contentful Paint is within acceptable ranges, but there may still be opportunities for minor improvements.",
    bottlenecks: [
      "Minor render-blocking resources",
      "Slightly large images",
      "Potential for further optimization",
    ],
    optimizations: [
      "Fine-tune critical resource loading",
      "Further optimize images and media",
      "Consider advanced optimization techniques",
    ],
    implementation:
      "Focus on incremental improvements to the critical rendering path.",
    expectedImprovement: "FCP may improve by 5-15% with fine-tuning.",
    verification: "Continue monitoring FCP to catch any regressions.",
  };
};

const getFCPStatus = (fcp: number) => {
  if (fcp < 1800)
    return { level: "Good", color: "bg-green-500", icon: CheckCircle };
  if (fcp < 3000)
    return { level: "Moderate", color: "bg-amber-500", icon: AlertTriangle };
  return { level: "Poor", color: "bg-red-500", icon: AlertTriangle };
};

const FCPBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState<keyof FCPData>("avg_fcp_value");
  const [selectedConnection, setSelectedConnection] = useState<FCPData | null>(
    null
  );

  const filteredData = useMemo(() => {
    return [...data]
      .filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase()
      )
      .sort((a, b) => Number(b[sortKey]) - Number(a[sortKey]))
      .slice(0, 8); // Limit to top 8 connection types
  }, [data, selectedDevice, sortKey]);

  // Set default selected connection
  React.useEffect(() => {
    if (filteredData.length > 0 && !selectedConnection) {
      setSelectedConnection(filteredData[0]);
    } else if (filteredData.length === 0) {
      setSelectedConnection(null);
    }
  }, [filteredData, selectedConnection]);

  if (!filteredData.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <BeatLoader color="#6366f1" loading={true} size={8} />
        <p className="mt-2 text-gray-500 text-xs">Loading FCP data...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left: Connection Types */}
        <div className="w-full md:w-1/3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Connection Types
            </h3>
            <select
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as keyof FCPData)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            {filteredData.map((item, i) => {
              const isSelected =
                selectedConnection?.connection_type === item.connection_type;
              const status = getFCPStatus(item.avg_fcp_value);
              const StatusIcon = status.icon;

              return (
                <div
                  key={i}
                  className={`p-2 rounded cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  }`}
                  onClick={() => setSelectedConnection(item)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-medium capitalize">
                      {item.connection_type}
                    </h4>
                    <StatusIcon
                      className={`w-3.5 h-3.5 ${
                        status.color === "bg-green-500"
                          ? "text-green-500"
                          : status.color === "bg-amber-500"
                          ? "text-amber-500"
                          : "text-red-500"
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      {item.occurrence_count}x
                    </div>
                    <div className="text-[10px] font-medium">
                      {Math.round(item.avg_fcp_value)}ms
                    </div>
                  </div>

                  <div className="relative h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full ${status.color}`}
                      style={{
                        width: `${Math.min(
                          (item.avg_fcp_value / 4000) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Critical Path Analysis */}
        <div className="w-full md:w-2/3">
          <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Critical Rendering Path Analysis
          </h3>

          {selectedConnection ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              {/* Connection Header */}
              <div className="pb-2 border-b border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium capitalize">
                      {selectedConnection.connection_type} Connection
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          selectedConnection.avg_fcp_value > 3000
                            ? "bg-red-500"
                            : selectedConnection.avg_fcp_value > 1800
                            ? "bg-amber-500"
                            : "bg-green-500"
                        }`}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedConnection.avg_fcp_value > 3000
                          ? "Poor FCP"
                          : selectedConnection.avg_fcp_value > 1800
                          ? "Moderate FCP"
                          : "Good FCP"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Avg FCP
                    </div>
                    <div className="text-sm font-medium">
                      {Math.round(selectedConnection.avg_fcp_value)}ms
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    P75
                  </p>
                  <p className="text-sm font-medium">
                    {Math.round(selectedConnection.p75_fcp_value)}ms
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    P90
                  </p>
                  <p className="text-sm font-medium">
                    {Math.round(selectedConnection.p90_fcp_value)}ms
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    P95
                  </p>
                  <p className="text-sm font-medium">
                    {Math.round(selectedConnection.p95_fcp_value)}ms
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Occurrences
                  </p>
                  <p className="text-sm font-medium">
                    {selectedConnection.occurrence_count}
                  </p>
                </div>
              </div>

              {/* Distribution */}
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Performance Distribution
                </h5>
                <div className="h-2 w-full flex rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  <div
                    className="bg-green-500"
                    style={{
                      width: `${
                        (selectedConnection.good_count /
                          (selectedConnection.good_count +
                            selectedConnection.needs_improvement_count +
                            selectedConnection.poor_count)) *
                        100
                      }%`,
                    }}
                  />
                  <div
                    className="bg-amber-500"
                    style={{
                      width: `${
                        (selectedConnection.needs_improvement_count /
                          (selectedConnection.good_count +
                            selectedConnection.needs_improvement_count +
                            selectedConnection.poor_count)) *
                        100
                      }%`,
                    }}
                  />
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${
                        (selectedConnection.poor_count /
                          (selectedConnection.good_count +
                            selectedConnection.needs_improvement_count +
                            selectedConnection.poor_count)) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
                  <span>Good: {selectedConnection.good_count}</span>
                  <span>
                    Needs Improvement:{" "}
                    {selectedConnection.needs_improvement_count}
                  </span>
                  <span>Poor: {selectedConnection.poor_count}</span>
                </div>
              </div>

              {/* Critical Path Analysis */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  Critical Path Analysis
                </h5>

                {(() => {
                  const analysis = getCriticalPathAnalysis(
                    selectedConnection.avg_fcp_value,
                    selectedConnection.connection_type
                  );

                  return (
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                        <h6 className="text-xs font-medium mb-1">
                          {analysis.title}
                        </h6>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {analysis.description}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h6 className="text-xs font-medium flex items-center gap-1">
                          <Timer className="h-3.5 w-3.5 text-red-500" />
                          Bottlenecks
                        </h6>
                        <ul className="space-y-1">
                          {analysis.bottlenecks.map((bottleneck, i) => (
                            <li
                              key={i}
                              className="text-xs flex items-start gap-1.5"
                            >
                              <div className="flex-shrink-0 mt-1 w-1 h-1 rounded-full bg-red-500" />
                              <span>{bottleneck}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h6 className="text-xs font-medium flex items-center gap-1">
                          <Zap className="h-3.5 w-3.5 text-indigo-500" />
                          Optimizations
                        </h6>
                        <ul className="space-y-1">
                          {analysis.optimizations.map((optimization, i) => (
                            <li
                              key={i}
                              className="text-xs flex items-start gap-1.5"
                            >
                              <div className="flex-shrink-0 mt-1 w-1 h-1 rounded-full bg-indigo-500" />
                              <span>{optimization}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div>
                          <h6 className="text-xs font-medium">
                            Implementation
                          </h6>
                          <p className="text-xs">{analysis.implementation}</p>
                        </div>
                        <div>
                          <h6 className="text-xs font-medium">
                            Expected Improvement
                          </h6>
                          <p className="text-xs">
                            {analysis.expectedImprovement}
                          </p>
                        </div>
                      </div>

                      <div className="pt-1">
                        <h6 className="text-xs font-medium">Verification</h6>
                        <p className="text-xs">{analysis.verification}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Additional Resources */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Learn More
                </h5>
                <ul className="mt-1 space-y-1">
                  <li className="text-xs">
                    <a
                      href="https://web.dev/fcp/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-500 hover:text-indigo-600 underline"
                    >
                      First Contentful Paint (FCP) - web.dev
                    </a>
                  </li>
                  <li className="text-xs">
                    <a
                      href="https://developers.google.com/web/fundamentals/performance/critical-rendering-path/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-500 hover:text-indigo-600 underline"
                    >
                      Optimizing the Critical Rendering Path - Google Developers
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <Layers className="h-8 w-8 text-indigo-500 mb-2" />
              <h4 className="text-xs font-medium">
                Select a connection to analyze
              </h4>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 text-center max-w-xs">
                Choose a connection type to see a detailed critical rendering
                path analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default FCPBreakdownChart;
