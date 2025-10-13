"use client";

import React, { useState, useMemo } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import BeatLoader from "react-spinners/BeatLoader";
import Image from "next/image";
import {
  Target,
  Zap,
  Image as ImageIcon,
  Download,
  Monitor,
  BarChart3,
  TrendingUp,
  Type,
} from "lucide-react";

interface LCPElementData {
  element_target: string;
  avg_lcp_value: number;
  avg_resource_load_delay: number;
  avg_resource_load_duration: number;
  avg_element_render_delay: number;
  occurrence_count: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
  device_type: string;
  page_url: string;
  image_url: string;
}

interface Props {
  data: LCPElementData[];
}

const SORT_OPTIONS = [
  { label: "LCP", value: "avg_lcp_value" },
  { label: "Load Delay", value: "avg_resource_load_delay" },
  { label: "Duration", value: "avg_resource_load_duration" },
  { label: "Render Delay", value: "avg_element_render_delay" },
];

// Define an optimization action interface
interface OptimizationAction {
  id: string;
  title: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  description: string;
  implementation: string;
  code?: string;
}

// Define a timing phase interface
interface TimingPhase {
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
}

// find LCP component type
const getComponentType = (target: string): string => {
  const lower = target.toLowerCase();

  if (
    lower.includes("img") ||
    lower.includes(".jpg") ||
    lower.includes(".png") ||
    lower.includes(".webp") ||
    lower.includes(".avif")
  ) {
    return "Image";
  }

  if (lower.includes("video") || lower.includes(".mp4")) {
    return "Video";
  }

  if (
    lower.includes("button") ||
    lower.includes("click") ||
    lower.includes("cta")
  ) {
    return "Button or CTA";
  }

  if (
    lower.includes("font") ||
    lower.includes("title") ||
    lower.includes("h1") ||
    lower.includes("h2") ||
    lower.includes("headline")
  ) {
    return "Heading or Font";
  }

  if (
    lower.includes("header") ||
    lower.includes("nav") ||
    lower.includes("menu")
  ) {
    return "Navigation/Header";
  }

  if (
    lower.includes("p") ||
    lower.includes("paragraph") ||
    lower.includes("hero") ||
    lower.includes("intro")
  ) {
    return "Text Block";
  }

  return "Unknown Element";
};

// Function to get specific optimization actions based on LCP data and element type
const getOptimizationActions = (
  elementTarget: string,
  totalLCP: number,
  resourceLoadDelay: number,
  resourceLoadDuration: number,
  elementRenderDelay: number,
  componentType: string
): OptimizationAction[] => {
  const actions: OptimizationAction[] = [];

  // Calculate percentages
  const loadDelayPercentage = (resourceLoadDelay / totalLCP) * 100;
  const loadDurationPercentage = (resourceLoadDuration / totalLCP) * 100;
  const renderDelayPercentage = (elementRenderDelay / totalLCP) * 100;

  // Common actions for all element types
  if (loadDelayPercentage > 30) {
    actions.push({
      id: "preload",
      title: "Preload Critical Resource",
      impact: "high",
      effort: "low",
      description: "Add preload hint to prioritize LCP resource loading",
      implementation: "Add <link rel='preload'> to document head",
    });
  }

  if (renderDelayPercentage > 30) {
    actions.push({
      id: "render-blocking",
      title: "Eliminate Render-Blocking Resources",
      impact: "high",
      effort: "medium",
      description: "Remove or defer render-blocking CSS and JavaScript",
      implementation:
        "Defer non-critical CSS and JavaScript, inline critical CSS",
    });
  }

  // Type-specific actions
  if (componentType === "Image") {
    // Image-specific actions
    if (loadDurationPercentage > 30) {
      actions.push({
        id: "image-compress",
        title: "Optimize Image Format",
        impact: "high",
        effort: "medium",
        description: "Convert to modern format and compress",
        implementation:
          "Convert images to WebP/AVIF and compress at 75-85% quality",
        code: `<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="...">
</picture>`,
      });

      actions.push({
        id: "responsive-images",
        title: "Implement Responsive Images",
        impact: "medium",
        effort: "medium",
        description: "Serve appropriately sized images for different viewports",
        implementation: "Use srcset and sizes attributes for responsive images",
        code: `<img srcset="image-400.jpg 400w,
             image-800.jpg 800w"
     sizes="(max-width: 600px) 400px, 800px"
     src="image-default.jpg" alt="...">`,
      });
    }

    actions.push({
      id: "fetchpriority",
      title: "Set Fetch Priority",
      impact: "high",
      effort: "low",
      description: "Signal to browser that LCP image is high priority",
      implementation: "Add fetchpriority='high' to LCP image element",
      code: `<img src="/path/to/lcp-image.jpg" fetchpriority="high" alt="...">`,
    });

    actions.push({
      id: "image-dimensions",
      title: "Set Explicit Dimensions",
      impact: "medium",
      effort: "low",
      description: "Set width and height attributes to prevent layout shifts",
      implementation: "Add width and height attributes to LCP image",
      code: `<img src="image.jpg" width="800" height="600" alt="...">`,
    });
  } else if (componentType === "Heading or Font") {
    // Font-specific actions
    actions.push({
      id: "font-preload",
      title: "Preload Critical Fonts",
      impact: "high",
      effort: "low",
      description: "Preload web fonts to prevent FOIT/FOUT",
      implementation: "Add preload links for critical fonts in document head",
      code: `<link rel="preload" href="/fonts/critical-font.woff2" as="font" type="font/woff2" crossorigin>`,
    });

    actions.push({
      id: "font-display",
      title: "Optimize Font Display Strategy",
      impact: "high",
      effort: "low",
      description: "Use font-display to control how fonts are displayed",
      implementation: "Add font-display: swap to @font-face declaration",
      code: `@font-face {
  font-family: 'My Font';
  src: url('/fonts/my-font.woff2') format('woff2');
  font-display: swap;
}`,
    });

    actions.push({
      id: "font-subsetting",
      title: "Subset Fonts",
      impact: "medium",
      effort: "medium",
      description: "Create font subsets to reduce file size",
      implementation:
        "Use tools to subset fonts to only include required characters",
    });

    actions.push({
      id: "system-font-stack",
      title: "Use System Fonts",
      impact: "medium",
      effort: "low",
      description: "Consider using system fonts for faster rendering",
      implementation:
        "Use system font stack in CSS: font-family: system-ui, sans-serif",
    });
  } else if (componentType === "Text Block") {
    // Text-specific actions
    actions.push({
      id: "critical-css",
      title: "Inline Critical CSS",
      impact: "high",
      effort: "high",
      description: "Inline CSS required for above-the-fold text",
      implementation: "Extract and inline critical CSS in HTML head",
    });

    actions.push({
      id: "text-rendering",
      title: "Optimize Text Rendering",
      impact: "medium",
      effort: "low",
      description: "Improve text rendering performance",
      implementation: "Add text-rendering: optimizeLegibility to CSS",
    });
  } else {
    // Generic actions for other element types
    actions.push({
      id: "critical-path",
      title: "Optimize Critical Rendering Path",
      impact: "high",
      effort: "high",
      description: "Streamline the critical rendering path for faster paint",
      implementation: "Analyze and optimize all resources that block rendering",
    });

    actions.push({
      id: "resource-hints",
      title: "Add Resource Hints",
      impact: "medium",
      effort: "low",
      description: "Use resource hints to optimize loading",
      implementation: "Add preconnect, prefetch, or preload hints as needed",
    });
  }

  // General high-impact actions
  if (totalLCP > 2500) {
    actions.push({
      id: "reduce-chunk-size",
      title: "Reduce JavaScript Bundle Size",
      impact: "high",
      effort: "medium",
      description: "Minimize and split JavaScript bundles",
      implementation:
        "Use code splitting and tree shaking to reduce bundle size",
    });
  }

  return actions;
};

// Function to get timing phases with proper icons
const getTimingPhases = (
  resourceLoadDelay: number,
  resourceLoadDuration: number,
  elementRenderDelay: number
): TimingPhase[] => {
  const total = resourceLoadDelay + resourceLoadDuration + elementRenderDelay;

  return [
    {
      name: "Discovery",
      value: resourceLoadDelay,
      percentage: (resourceLoadDelay / total) * 100,
      color: "bg-indigo-400",
      icon: <Target className="w-4 h-4" />,
    },
    {
      name: "Loading",
      value: resourceLoadDuration,
      percentage: (resourceLoadDuration / total) * 100,
      color: "bg-indigo-600",
      icon: <Download className="w-4 h-4" />,
    },
    {
      name: "Rendering",
      value: elementRenderDelay,
      percentage: (elementRenderDelay / total) * 100,
      color: "bg-indigo-800",
      icon: <Monitor className="w-4 h-4" />,
    },
  ];
};

const LCPBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [selectedElement, setSelectedElement] = useState<LCPElementData | null>(
    null
  );
  const [sortKey, setSortKey] = useState<keyof LCPElementData>("avg_lcp_value"); // Added this line

  const filteredData = useMemo(() => {
    const dedupedMap = new Map<string, LCPElementData>();

    data
      ?.filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase()
      )
      .forEach((item) => {
        const key = item.element_target?.trim().toLowerCase();
        if (!dedupedMap.has(key)) {
          dedupedMap.set(key, item);
        } else {
          const existing = dedupedMap.get(key)!;
          if (item.occurrence_count > existing.occurrence_count) {
            dedupedMap.set(key, item);
          }
        }
      });

    const sorted = Array.from(dedupedMap.values()).sort((a, b) => {
      const valA = a[sortKey] as number;
      const valB = b[sortKey] as number;
      return (valB || 0) - (valA || 0);
    });

    return sorted.slice(0, 8); // Limit to top 8 elements
  }, [data, selectedDevice, sortKey]); // Added sortKey to dependency array

  // Set default selected element
  React.useEffect(() => {
    if (filteredData.length > 0 && !selectedElement) {
      setSelectedElement(filteredData[0]);
    } else if (filteredData.length === 0) {
      setSelectedElement(null);
    }
  }, [filteredData, selectedElement]);

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <BeatLoader color="#6366f1" loading={true} size={8} />
        <p className="mt-2 text-gray-500 text-xs">Loading LCP data...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left: LCP elements list */}
        <div className="w-full md:w-1/3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              LCP Elements
            </h3>
            <select
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={sortKey}
              onChange={(e) =>
                setSortKey(e.target.value as keyof LCPElementData)
              }
            >
              {SORT_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="border-gray-200"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            {filteredData.map((item, i) => {
              const { element_target, avg_lcp_value, occurrence_count } = item;
              const isSelected =
                selectedElement?.element_target === element_target;
              const componentType = getComponentType(element_target);

              // Determine the primary bottleneck
              // const loadDelayPercentage =
              //   (item.avg_resource_load_delay / avg_lcp_value) * 100;
              // const loadDurationPercentage =
              //   (item.avg_resource_load_duration / avg_lcp_value) * 100;
              // const renderDelayPercentage =
              //   (item.avg_element_render_delay / avg_lcp_value) * 100;

              let bottleneckColor = "bg-green-500";
              if (avg_lcp_value > 4000) {
                bottleneckColor = "bg-red-500";
              } else if (avg_lcp_value > 2500) {
                bottleneckColor = "bg-amber-500";
              }

              // let bottleneckIcon = <Target className="w-3.5 h-3.5" />;
              // if (loadDelayPercentage > 40) {
              //   bottleneckIcon = bottleneckIcon;
              // } else if (loadDurationPercentage > 40) {
              //   bottleneckIcon = <Download className="w-3.5 h-3.5" />;
              // } else if (renderDelayPercentage > 40) {
              //   bottleneckIcon = <Monitor className="w-3.5 h-3.5" />;
              // }

              return (
                <div
                  key={i}
                  className={`p-2 rounded cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  }`}
                  onClick={() => setSelectedElement(item)}
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-medium truncate">
                        {element_target}
                      </h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {componentType}
                        </span>
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${bottleneckColor}`}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <span
                        className={`text-xs font-medium ${
                          avg_lcp_value <= 2500
                            ? "text-green-600 dark:text-green-400"
                            : avg_lcp_value <= 4000
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {Math.round(avg_lcp_value)}ms
                      </span>
                      <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                        {occurrence_count}x
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Optimization Actions */}
        <div className="w-full md:w-2/3">
          <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Optimization Actions
          </h3>

          {selectedElement ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              {/* Element Header */}
              <div className="pb-2 border-b border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium">
                      {selectedElement.element_target}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          selectedElement.avg_lcp_value > 4000
                            ? "bg-red-500"
                            : selectedElement.avg_lcp_value > 2500
                            ? "bg-amber-500"
                            : "bg-green-500"
                        }`}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getComponentType(selectedElement.element_target)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Total LCP
                    </div>
                    <div className="text-sm font-medium">
                      {Math.round(selectedElement.avg_lcp_value)}ms
                    </div>
                  </div>
                </div>
              </div>

              {/* Timing Phases */}
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Timing Breakdown
                </h5>

                <div className="flex flex-col gap-2">
                  {getTimingPhases(
                    selectedElement.avg_resource_load_delay,
                    selectedElement.avg_resource_load_duration,
                    selectedElement.avg_element_render_delay
                  ).map((phase, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          {phase.icon}
                          <span>{phase.name}</span>
                        </div>
                        <span>
                          {Math.round(phase.value)}ms (
                          {Math.round(phase.percentage)}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${phase.color}`}
                          style={{ width: `${phase.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optimization Actions */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Recommended Actions
                </h5>

                <div className="space-y-2">
                  {getOptimizationActions(
                    selectedElement.element_target,
                    selectedElement.avg_lcp_value,
                    selectedElement.avg_resource_load_delay,
                    selectedElement.avg_resource_load_duration,
                    selectedElement.avg_element_render_delay,
                    getComponentType(selectedElement.element_target)
                  ).map((action) => (
                    <div
                      key={action.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h6 className="text-xs font-medium">
                              {action.title}
                            </h6>
                            <div className="flex gap-1">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  action.impact === "high"
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                    : action.impact === "medium"
                                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                    : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                }`}
                              >
                                {action.impact}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  action.effort === "low"
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                    : action.effort === "medium"
                                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                }`}
                              >
                                {action.effort} effort
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {action.description}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Zap
                            className={`h-4 w-4 ${
                              action.impact === "high"
                                ? "text-red-500"
                                : action.impact === "medium"
                                ? "text-amber-500"
                                : "text-green-500"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-medium mb-1">
                          Implementation:
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {action.implementation}
                        </p>

                        {action.code && (
                          <div className="relative">
                            <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto">
                              {action.code}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Element Preview */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Element Preview
                </h5>
                <div className="mt-2">
                  {selectedElement?.image_url ? (
                    <div className="flex justify-center">
                      <Image
                        src={selectedElement.image_url}
                        width={200}
                        height={120}
                        alt={selectedElement.element_target}
                        className="rounded border border-gray-100 dark:border-gray-700"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-20 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700">
                      {getComponentType(selectedElement.element_target) ===
                      "Image" ? (
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      ) : (
                        <Type className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  )}

                  <div className="mt-2">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Page URL
                    </p>
                    <p className="text-xs truncate">
                      {selectedElement?.page_url.includes("?")
                        ? selectedElement.page_url.split("?")[0]
                        : selectedElement.page_url}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <TrendingUp className="h-8 w-8 text-indigo-500 mb-2" />
              <h4 className="text-xs font-medium">
                Select an element to view actions
              </h4>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 text-center max-w-xs">
                Choose an LCP element to see specific optimization actions with
                implementation details.
              </p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default LCPBreakdownChart;
