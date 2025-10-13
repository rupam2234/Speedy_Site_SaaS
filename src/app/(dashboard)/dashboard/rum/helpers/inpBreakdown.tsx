"use client";

import React, { useState, useMemo } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import BeatLoader from "react-spinners/BeatLoader";
import { Copy, CheckCircle, Clock, Zap, Code, FileText } from "lucide-react";

interface INPElementData {
  device_type: string;
  interaction_type: "pointer" | "keyboard";
  affected_element: string;
  occurrence_count: number;
  avg_inp_value: number;
  min_inp_value: number;
  max_inp_value: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}

interface Props {
  data: INPElementData[];
}

const SORT_OPTIONS = [
  { label: "Avg INP", value: "avg_inp_value" },
  { label: "Max INP", value: "max_inp_value" },
  { label: "Occurrences", value: "occurrence_count" },
];

// Define a fix recipe interface
interface FixRecipe {
  title: string;
  problem: string;
  ingredients: string[];
  steps: string[];
  codeSnippet?: string;
  expectedOutcome: string;
  resources?: { title: string; url: string }[];
}

// Function to get specific fix recipes based on element type and INP value
const getFixRecipe = (
  element: string,
  inpValue: number
  // interactionType: string
): FixRecipe => {
  const lower = element.toLowerCase();

  // Button click issues
  if (
    (lower.includes("button") ||
      lower.includes("click") ||
      lower.includes("submit")) &&
    inpValue > 200
  ) {
    return {
      title: "Optimize Button Click Handler",
      problem:
        "Heavy JavaScript execution in button click handler is delaying interaction response.",
      ingredients: [
        "Debounce function",
        "Event listener",
        "requestIdleCallback or setTimeout",
      ],
      steps: [
        "Identify the click handler causing the delay",
        "Debounce the handler if it's called rapidly",
        "Break up long tasks into smaller chunks",
        "Defer non-critical work until after interaction",
      ],
      codeSnippet: `// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Apply to click handler
button.addEventListener('click', debounce((event) => {
  // Your handler code here
}, 100));`,
      expectedOutcome:
        "Button interactions respond faster with reduced INP scores.",
      resources: [
        {
          title: "Debouncing Explained",
          url: "https://css-tricks.com/debouncing-throttling-explained-examples/",
        },
        {
          title: "Optimize Long Tasks",
          url: "https://web.dev/long-tasks-devtools/",
        },
      ],
    };
  }

  // Input field issues
  if (
    (lower.includes("input") ||
      lower.includes("form") ||
      lower.includes("search") ||
      lower.includes("textarea")) &&
    inpValue > 150
  ) {
    return {
      title: "Optimize Input Field Performance",
      problem:
        "Frequent re-renders or heavy processing on each keystroke are causing delays.",
      ingredients: [
        "Debounce function",
        "Virtualization library (if applicable)",
        "requestAnimationFrame",
      ],
      steps: [
        "Debounce input event handlers",
        "Avoid re-rendering large components on each keystroke",
        "Use virtualization for long lists",
        "Batch DOM reads and writes",
      ],
      codeSnippet: `// Debounce input handler
const debouncedHandler = debounce((event) => {
  // Process input value
  const value = event.target.value;
  // Update state or perform other operations
}, 300);

input.addEventListener('input', debouncedHandler);

// For React, consider using useMemo/useCallback
const handleChange = useCallback(
  debounce((value) => {
    // Update state
    setInputValue(value);
  }, 300),
  []
);`,
      expectedOutcome:
        "Input fields respond immediately with no lag during typing.",
      resources: [
        {
          title: "React Performance Optimization",
          url: "https://reactjs.org/docs/optimizing-performance.html",
        },
        {
          title: "Input Event Performance",
          url: "https://web.dev/input-event-performance/",
        },
      ],
    };
  }

  // Dropdown/select issues
  if (
    (lower.includes("dropdown") || lower.includes("select")) &&
    inpValue > 180
  ) {
    return {
      title: "Optimize Dropdown Rendering",
      problem:
        "Complex dropdown rendering or filtering is causing interaction delays.",
      ingredients: [
        "Virtualization library",
        "Efficient filtering algorithm",
        "CSS transitions instead of JS animations",
      ],
      steps: [
        "Implement windowing/virtualization for large lists",
        "Optimize filtering algorithm",
        "Use CSS for animations instead of JavaScript",
        "Debounce filter input if applicable",
      ],
      codeSnippet: `// Using a virtualization library like react-window
import { FixedSizeList as List } from 'react-window';

const Row = ({ index, style }) => (
  <div style={style}>Row {index}</div>
);

const Dropdown = ({ items }) => (
  <List
    height={300}
    itemCount={items.length}
    itemSize={35}
  >
    {Row}
  </List>
);`,
      expectedOutcome:
        "Dropdowns open and respond quickly even with many options.",
      resources: [
        {
          title: "react-window Documentation",
          url: "https://react-window.vercel.app/",
        },
        {
          title: "Virtualization Explained",
          url: "https://web.dev/virtualize-long-lists/",
        },
      ],
    };
  }

  // General high INP issues
  if (inpValue > 300) {
    return {
      title: "Reduce Long Tasks",
      problem:
        "Long JavaScript tasks are blocking the main thread and delaying interaction response.",
      ingredients: [
        "Code splitting",
        "Web Workers",
        "requestIdleCallback",
        "Task scheduling library",
      ],
      steps: [
        "Identify long tasks using Chrome DevTools",
        "Break up long tasks into smaller chunks",
        "Move CPU-intensive work to Web Workers",
        "Use task scheduling to prioritize work",
      ],
      codeSnippet: `// Break up long tasks
function yieldToMain() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

async function processLargeArray(array) {
  for (let i = 0; i < array.length; i++) {
    // Process item
    processItem(array[i]);
    
    // Yield to main thread periodically
    if (i % 50 === 0) {
      await yieldToMain();
    }
  }
}`,
      expectedOutcome: "Main thread remains responsive, improving INP scores.",
      resources: [
        {
          title: "Optimize Long Tasks",
          url: "https://web.dev/long-tasks-devtools/",
        },
        {
          title: "Web Workers API",
          url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API",
        },
      ],
    };
  }

  // Default recipe for moderate INP issues
  return {
    title: "General Interaction Optimization",
    problem: "General interaction responsiveness can be improved.",
    ingredients: [
      "Performance monitoring",
      "Event optimization",
      "Code profiling",
    ],
    steps: [
      "Profile interactions using Chrome DevTools",
      "Identify bottlenecks in interaction handlers",
      "Optimize critical rendering paths",
      "Implement performance monitoring",
    ],
    codeSnippet: `// Measure interaction performance
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // Process INP entries
    console.log('INP:', entry);
  }
});

observer.observe({ type: 'interaction', buffered: true });`,
    expectedOutcome:
      "Improved interaction responsiveness and lower INP scores.",
    resources: [
      { title: "INP Optimization Guide", url: "https://web.dev/inp/" },
      {
        title: "Performance Observer API",
        url: "https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver",
      },
    ],
  };
};

const INPBreakdownChart: React.FC<Props> = ({ data }) => {
  const { selectedDevice } = useSiteContext();
  const [sortKey, setSortKey] = useState<keyof INPElementData>("avg_inp_value");
  const [selectedItem, setSelectedItem] = useState<INPElementData | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    return data
      ?.filter(
        (item) =>
          item.device_type?.toLowerCase() === selectedDevice?.toLowerCase()
      )
      .sort((a, b) => {
        const valA = Number(a[sortKey as keyof INPElementData]);
        const valB = Number(b[sortKey as keyof INPElementData]);
        return valB - valA;
      })
      .slice(0, 10); // Only top 10 elements
  }, [data, selectedDevice, sortKey]);

  // Set default selected item
  React.useEffect(() => {
    if (filteredData.length > 0 && !selectedItem) {
      setSelectedItem(filteredData[0]);
    } else if (filteredData.length === 0) {
      setSelectedItem(null);
    }
  }, [filteredData, selectedItem]);

  // Get fix recipe for selected item
  const fixRecipe = selectedItem
    ? getFixRecipe(
        selectedItem.affected_element,
        selectedItem.max_inp_value
        // selectedItem.interaction_type
      )
    : null;

  // Copy code snippet to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <BeatLoader color="#6366f1" loading={true} size={8} />
        <p className="mt-2 text-gray-500 text-xs">Loading INP data...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left: INP Elements */}
        <div className="w-full md:w-1/3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Top 10 INP Elements
            </h3>
            <select
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={sortKey}
              onChange={(e) =>
                setSortKey(e.target.value as keyof INPElementData)
              }
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
                selectedItem?.affected_element === item.affected_element;
              const severityColor =
                item.max_inp_value > 500
                  ? "bg-red-500"
                  : item.max_inp_value > 200
                  ? "bg-amber-500"
                  : "bg-green-500";

              return (
                <div
                  key={i}
                  className={`p-2 rounded cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-medium truncate">
                      {item.affected_element}
                    </h4>
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${severityColor} ml-1 mt-1`}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {item.interaction_type === "pointer" ? "🖱️" : "⌨️"}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {item.occurrence_count}x
                      </span>
                    </div>
                    <div className="text-[10px] font-medium">
                      {Math.round(item.avg_inp_value)}ms
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Max: {Math.round(item.max_inp_value)}ms
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Fix Recipe */}
        <div className="w-full md:w-2/3">
          <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Fix Recipe
          </h3>

          {selectedItem && fixRecipe ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              {/* Recipe Header */}
              <div className="pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                    <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">{fixRecipe.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {fixRecipe.problem}
                    </p>
                  </div>
                </div>
              </div>

              {/* Element Info */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Element
                  </p>
                  <p className="text-xs font-medium truncate">
                    {selectedItem.affected_element}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Max INP
                  </p>
                  <p className="text-xs font-medium">
                    {Math.round(selectedItem.max_inp_value)}ms
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Occurrences
                  </p>
                  <p className="text-xs font-medium">
                    {selectedItem.occurrence_count}
                  </p>
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  Ingredients
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {fixRecipe.ingredients.map((ingredient, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Steps
                </h5>
                <ol className="space-y-1.5">
                  {fixRecipe.steps.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">
                        {i + 1}
                      </div>
                      <span className="text-xs">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Code Snippet */}
              {fixRecipe.codeSnippet && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Code className="h-3.5 w-3.5" />
                    Code Snippet
                  </h5>
                  <div className="relative">
                    <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">
                      {fixRecipe.codeSnippet}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(fixRecipe.codeSnippet!)}
                      className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                    >
                      {copiedCode === fixRecipe.codeSnippet ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Expected Outcome */}
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Expected Outcome
                </h5>
                <p className="text-xs">{fixRecipe.expectedOutcome}</p>
              </div>

              {/* Resources */}
              {fixRecipe.resources && fixRecipe.resources.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Learn More
                  </h5>
                  <ul className="space-y-1">
                    {fixRecipe.resources.map((resource, i) => (
                      <li key={i} className="text-xs">
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-500 hover:text-indigo-600 underline"
                        >
                          {resource.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <Zap className="h-8 w-8 text-indigo-500 mb-2" />
              <h4 className="text-xs font-medium">
                Select an element to view fix recipe
              </h4>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 text-center max-w-xs">
                Choose an INP element to get a step-by-step recipe to fix the
                issue.
              </p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default INPBreakdownChart;
