"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import BeatLoader from "react-spinners/BeatLoader";
import {
  LayoutPanelLeft,
  Image as ImageIcon,
  Type,
  Monitor,
  AlertTriangle,
  CheckCircle,
  Eye,
  Lightbulb,
  BarChart3,
} from "lucide-react";

interface CLSElementData {
  device_type: string;
  affected_component: string;
  occurrence_count: number;
  avg_cls_value: number;
  min_cls_value: number;
  max_cls_value: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}

interface Props {
  data: CLSElementData[];
}

const SORT_OPTIONS = [
  { label: "Avg CLS", value: "avg_cls_value" },
  { label: "Max CLS", value: "max_cls_value" },
  { label: "Occurrences", value: "occurrence_count" },
];

// Define a visual diagnostic interface
interface VisualDiagnostic {
  title: string;
  description: string;
  visualExample: string;
  likelyCauses: string[];
  solution: string;
  implementation: string;
  verification: string;
}

// Function to get specific visual diagnostics based on component type and CLS value
const getVisualDiagnostic = (
  component: string
  // clsValue: number
): VisualDiagnostic => {
  const lower = component.toLowerCase();

  // Image-related CLS issues
  if (
    lower.includes("img") ||
    lower.includes("image") ||
    lower.includes(".jpg") ||
    lower.includes(".png") ||
    lower.includes(".webp")
  ) {
    return {
      title: "Image Layout Shift",
      description:
        "Images loading without reserved space cause content below to jump.",
      visualExample:
        "Text content suddenly moves down when an image loads above it.",
      likelyCauses: [
        "Missing width and height attributes on img elements",
        "CSS aspect-ratio not applied to image containers",
        "Images loading after page content has rendered",
      ],
      solution:
        "Reserve space for images before they load using explicit dimensions or CSS aspect-ratio.",
      implementation:
        "Add width and height attributes to img tags or use CSS aspect-ratio property on containers.",
      verification:
        "Check Layout Shifts in Chrome DevTools Performance tab to confirm shifts are eliminated.",
    };
  }

  // Ad-related CLS issues
  if (
    lower.includes("ad") ||
    lower.includes("advertisement") ||
    lower.includes("banner") ||
    lower.includes("iframe")
  ) {
    return {
      title: "Advertisement Layout Shift",
      description: "Ads loading asynchronously cause content to reposition.",
      visualExample:
        "Article content jumps down when an ad loads in the sidebar.",
      likelyCauses: [
        "Ad containers without fixed dimensions",
        "Ads loading after main content has rendered",
        "Multiple ad sizes causing inconsistent layouts",
      ],
      solution:
        "Reserve fixed space for ad containers regardless of whether they've loaded.",
      implementation:
        "Set explicit min-height and width on ad containers based on expected ad dimensions.",
      verification:
        "Test with slow network connection to verify content doesn't shift when ads load.",
    };
  }

  // Dynamic content CLS issues
  if (
    lower.includes("modal") ||
    lower.includes("popup") ||
    lower.includes("accordion") ||
    lower.includes("dropdown") ||
    lower.includes("menu")
  ) {
    return {
      title: "Dynamic Content Shift",
      description:
        "Interactive elements causing layout changes when activated.",
      visualExample:
        "Page content moves down when an accordion expands or dropdown opens.",
      likelyCauses: [
        "Dynamic content pushing existing elements down",
        "No reserved space for expandable content",
        "Absence of CSS transitions for smooth changes",
      ],
      solution:
        "Reserve space for dynamic content or use position changes that don't affect layout flow.",
      implementation:
        "Use position: absolute for elements that appear over content or reserve space with min-height.",
      verification:
        "Test all interactive elements to ensure they don't cause unexpected layout shifts.",
    };
  }

  // Font-related CLS issues
  if (lower.includes("font") || lower.includes("text")) {
    return {
      title: "Font Loading Shift",
      description:
        "Web fonts loading late cause text to reflow and reposition.",
      visualExample:
        "Text suddenly changes size or position when web font finishes loading.",
      likelyCauses: [
        "Web fonts loading after page content has rendered",
        "No font-display strategy implemented",
        "Fallback fonts with different dimensions than web fonts",
      ],
      solution: "Implement font loading strategies to minimize reflow.",
      implementation:
        "Use font-display: swap and consider preloading critical fonts.",
      verification:
        "Test with slow network connection to verify text doesn't shift when fonts load.",
    };
  }

  // Layout element CLS issues
  if (
    lower.includes("header") ||
    lower.includes("nav") ||
    lower.includes("footer") ||
    lower.includes("sidebar")
  ) {
    return {
      title: "Layout Element Shift",
      description: "Core layout components changing size after initial render.",
      visualExample:
        "Navigation bar height changes after loading, pushing content down.",
      likelyCauses: [
        "Dynamic content injection in layout elements",
        "Responsive behavior not accounted for",
        "Late-loaded content in layout components",
      ],
      solution:
        "Stabilize layout dimensions with fixed heights or responsive design patterns.",
      implementation:
        "Use CSS Grid or Flexbox with proper sizing to create stable layouts.",
      verification:
        "Test across different viewport sizes to ensure layout stability.",
    };
  }

  // Default diagnostic for general CLS issues
  return {
    title: "Unexpected Layout Shift",
    description: "Elements changing position after initial render.",
    visualExample:
      "Page content moves unexpectedly as additional resources load.",
    likelyCauses: [
      "Unsized media elements",
      "Dynamically injected content",
      "Network-dependent content rendering at different times",
    ],
    solution: "Reserve space for all elements that will appear on the page.",
    implementation:
      "Use appropriate sizing strategies for all elements and test with slow networks.",
    verification:
      "Use Chrome DevTools Layout Shifts detector to identify and fix shifts.",
  };
};

const getShiftSeverity = (clsValue: number) => {
  if (clsValue < 0.1)
    return { level: "Good", color: "bg-green-500", icon: CheckCircle };
  if (clsValue < 0.25)
    return { level: "Moderate", color: "bg-amber-500", icon: AlertTriangle };
  return { level: "Poor", color: "bg-red-500", icon: AlertTriangle };
};

const CLSBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState<keyof CLSElementData>("avg_cls_value");
  const [selectedItem, setSelectedItem] = useState<CLSElementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate and filter data
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      console.error("Invalid data provided to CLSBreakdownChart:", data);
      return [];
    }

    const filtered = data
      .filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase() &&
          item.affected_component &&
          item.affected_component !== "unknown"
      )
      .sort((a, b) => {
        const valA = Number(a[sortKey]);
        const valB = Number(b[sortKey]);
        return valB - valA;
      })
      .slice(0, 10); // Only top 10 elements

    return filtered;
  }, [data, selectedDevice, sortKey]);

  // Set default selected item
  useEffect(() => {
    if (filteredData.length > 0 && !selectedItem) {
      setSelectedItem(filteredData[0]);
    } else if (filteredData.length === 0) {
      setSelectedItem(null);
    }
    setIsLoading(false);
  }, [filteredData, selectedItem]);

  // Format component name for display
  const formatComponentName = (name: string) => {
    let formatted = name;
    if (name.includes("#")) {
      formatted = formatted.replace("#", "");
    }
    if (name.includes("/")) {
      formatted = formatted.split("/")[0];
    }
    if (name.length > 100) {
      formatted = formatted.replaceAll(".", " > ");
    }
    return formatted.length > 50 ? `${formatted.slice(0, 47)}...` : formatted;
  };

  // Get component icon based on component type
  const getComponentIcon = (component: string) => {
    const lower = component.toLowerCase();

    if (
      lower.includes("img") ||
      lower.includes("image") ||
      lower.includes(".jpg") ||
      lower.includes(".png") ||
      lower.includes(".webp")
    ) {
      return <ImageIcon className="w-4 h-4" />;
    }

    if (
      lower.includes("ad") ||
      lower.includes("advertisement") ||
      lower.includes("banner") ||
      lower.includes("iframe")
    ) {
      return <Monitor className="w-4 h-4" />;
    }

    if (
      lower.includes("modal") ||
      lower.includes("popup") ||
      lower.includes("accordion") ||
      lower.includes("dropdown") ||
      lower.includes("menu")
    ) {
      return <LayoutPanelLeft className="w-4 h-4" />;
    }

    if (lower.includes("font") || lower.includes("text")) {
      return <Type className="w-4 h-4" />;
    }

    if (
      lower.includes("header") ||
      lower.includes("nav") ||
      lower.includes("footer") ||
      lower.includes("sidebar")
    ) {
      return <LayoutPanelLeft className="w-4 h-4" />;
    }

    return <LayoutPanelLeft className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <BeatLoader color="#6366f1" loading={true} size={8} />
        <p className="mt-2 text-gray-500 text-xs">Loading CLS data...</p>
      </div>
    );
  }

  if (!filteredData.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <BarChart3 className="h-8 w-8 text-gray-400 mb-2" />
        <h4 className="text-xs font-medium">No CLS data available</h4>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 text-center">
          No CLS data available for {selectedDevice}.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left: CLS Elements */}
        <div className="w-full md:w-1/3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Layout Shift Elements
            </h3>
            <select
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value as keyof CLSElementData);
              }}
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
                selectedItem?.affected_component === item.affected_component;
              const severity = getShiftSeverity(item.avg_cls_value);
              const SeverityIcon = severity.icon;

              return (
                <div
                  key={i}
                  className={`p-2 rounded cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  }`}
                  onClick={() => {
                    setSelectedItem(item);
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        {getComponentIcon(item.affected_component)}
                      </div>
                      <h4 className="text-xs font-medium truncate">
                        {formatComponentName(item.affected_component)}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <SeverityIcon
                        className={`w-3.5 h-3.5 ${
                          severity.color === "bg-green-500"
                            ? "text-green-500"
                            : severity.color === "bg-amber-500"
                            ? "text-amber-500"
                            : "text-red-500"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      {item.occurrence_count}x
                    </div>
                    <div className="text-[10px] font-medium">
                      {item.avg_cls_value.toFixed(3)}
                    </div>
                  </div>

                  <div className="relative h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full ${severity.color}`}
                      style={{
                        width: `${Math.min(item.avg_cls_value * 400, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Visual Diagnostic */}
        <div className="w-full md:w-2/3">
          <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Shift Detective
          </h3>

          {selectedItem ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              {/* Component Header */}
              <div className="pb-2 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                    {getComponentIcon(selectedItem.affected_component)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">
                      {formatComponentName(selectedItem.affected_component)}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          selectedItem.avg_cls_value > 0.25
                            ? "bg-red-500"
                            : selectedItem.avg_cls_value > 0.1
                            ? "bg-amber-500"
                            : "bg-green-500"
                        }`}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedItem.avg_cls_value > 0.25
                          ? "Poor Shift"
                          : selectedItem.avg_cls_value > 0.1
                          ? "Moderate Shift"
                          : "Minor Shift"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Shift Value
                  </p>
                  <p className="text-sm font-medium">
                    {selectedItem.avg_cls_value.toFixed(3)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Max Shift
                  </p>
                  <p className="text-sm font-medium">
                    {selectedItem.max_cls_value.toFixed(3)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Occurrences
                  </p>
                  <p className="text-sm font-medium">
                    {selectedItem.occurrence_count}
                  </p>
                </div>
              </div>

              {/* Visual Diagnostic */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  Visual Diagnosis
                </h5>

                {(() => {
                  const diagnostic = getVisualDiagnostic(
                    selectedItem.affected_component
                    // selectedItem.avg_cls_value
                  );

                  return (
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                        <h6 className="text-xs font-medium mb-1">
                          {diagnostic.title}
                        </h6>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {diagnostic.description}
                        </p>
                        <div className="mt-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs italic">
                          &quot;{diagnostic.visualExample}&quot;
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h6 className="text-xs font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          Likely Causes
                        </h6>
                        <ul className="space-y-1">
                          {diagnostic.likelyCauses.map((cause, i) => (
                            <li
                              key={i}
                              className="text-xs flex items-start gap-1.5"
                            >
                              <div className="flex-shrink-0 mt-1 w-1 h-1 rounded-full bg-amber-500" />
                              <span>{cause}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h6 className="text-xs font-medium flex items-center gap-1">
                          <Lightbulb className="h-3.5 w-3.5 text-indigo-500" />
                          Solution
                        </h6>
                        <p className="text-xs">{diagnostic.solution}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <h6 className="text-xs font-medium">
                            Implementation
                          </h6>
                          <p className="text-xs">{diagnostic.implementation}</p>
                        </div>
                        <div className="space-y-1">
                          <h6 className="text-xs font-medium">Verification</h6>
                          <p className="text-xs">{diagnostic.verification}</p>
                        </div>
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
                      href="https://web.dev/cls/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-500 hover:text-indigo-600 underline"
                    >
                      Cumulative Layout Shift (CLS) - web.dev
                    </a>
                  </li>
                  <li className="text-xs">
                    <a
                      href="https://developers.google.com/web/fundamentals/performance/cls"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-500 hover:text-indigo-600 underline"
                    >
                      Debug and fix layout shifts - Google Developers
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <Eye className="h-8 w-8 text-indigo-500 mb-2" />
              <h4 className="text-xs font-medium">
                Select an element to diagnose shifts
              </h4>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 text-center max-w-xs">
                Choose a layout shift element to see a visual diagnosis and
                solution.
              </p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CLSBreakdownChart;
