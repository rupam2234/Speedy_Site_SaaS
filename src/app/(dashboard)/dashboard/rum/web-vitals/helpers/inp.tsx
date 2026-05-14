import { InpElementType } from "@/app/api/rum/elements/inp/route";
import { CustomTooltip, LoadingAnimation, THEME } from "@/components/theme";
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Search,
  SortDesc,
  StarsIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSiteContext } from "../../../siteContext";
import Link from "next/link";

export default function INPelements({
  contributors = [],
}: {
  contributors: InpElementType[];
}) {
  const { selectedSite } = useSiteContext();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"INP value" | "Processing Duration">(
    "INP value",
  );
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [activeItem, setActiveItem] = useState<InpElementType | null>(null);
  const [dropDownOpen, setDropDownOpen] = useState<boolean>(false);
  const [analysing, setAnalysing] = useState<string | null>(null);

  const [analysisResult, setAnalysisResult] = useState<string>("");

  const parsedLines = useMemo(() => {
    return analysisResult
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^•\s?/, ""));
  }, [analysisResult]);

  useEffect(() => {
    // data loaded immediately
    if (contributors.length > 0) {
      setDataLoaded(true);
    }

    // const timer = setTimeout(() => {
    //   setDataLoaded(true);
    // }, 10000);

    // return () => clearTimeout(timer);
  }, [contributors]);

  const sortedElements = useMemo(() => {
    const sorted = [...contributors];

    switch (filter) {
      case "INP value":
        return sorted.sort((a, b) => b.inp_value - a.inp_value);

      case "Processing Duration":
        return sorted.sort(
          (a, b) => b.processing_duration - a.processing_duration,
        );

      default:
        return contributors;
    }
  }, [contributors, filter]);

  const timeShare = useMemo(() => {
    if (!activeItem) return null;

    const { input_delay, processing_duration, presentation_delay } = activeItem;

    const total = input_delay + processing_duration + presentation_delay;

    if (total === 0) {
      return {
        input_delay_p: 0,
        processing_duration_p: 0,
        presentation_delay_p: 0,
      };
    }

    return {
      input_delay_p: (input_delay / total) * 100,
      processing_duration_p: (processing_duration / total) * 100,
      presentation_delay_p: (presentation_delay / total) * 100,
      total,
    };
  }, [activeItem]);

  const items = [
    { title: "Input Delay", value: activeItem?.input_delay },
    { title: "Processing Duration", value: activeItem?.processing_duration },
    { title: "Presentation Delay", value: activeItem?.presentation_delay },
  ];

  if (sortedElements.length === 0) {
    return <LoadingAnimation />;
  }

  return (
    <div className="w-full text-foreground font-sans">
      <div className="flex items-center justify-between p-3 border border-neutral-300 dark:border-neutral-700 bg-neutral-100/50 dark:bg-secondary-background rounded-sm mb-4">
        <div className="flex items-center gap-3 flex-1 px-2">
          <Search size={16} className="text-neutral-500" />
          <input
            placeholder="Search elements or URLs..."
            className="bg-transparent outline-none w-full text-sm placeholder:text-neutral-500 text-foreground"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
        </div>
        <div className="flex items-center gap-6 text-xs font-bold text-neutral-500 uppercase tracking-tighter">
          <div className="flex items-center text-sm text-primary/80 gap-1">
            <SortDesc size={16} />
            <div className="flex items-center">
              {["INP value", "Processing Duration"].map((x, index) => (
                <button
                  onClick={() =>
                    setFilter(x as "INP value" | "Processing Duration")
                  }
                  className={`px-2 py-0.5 rounded-sm ${filter === x ? "bg-primary/80 text-primary-foreground" : ""}`}
                  key={index}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Empty Data */}
      {!dataLoaded && (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-sm bg-neutral-50/30 dark:bg-secondary-background/50 text-center">
          <div className="p-3 bg-emerald-500/10 rounded-full mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            No INP Elements Found
          </h3>
          <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400 mt-2 px-6">
            Your INP is likely within the healthy range, or we don&apos;t have
            enought data to show yet. No specific slow or unresponsive events
            were identified as of now.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
        {/* left side */}
        <div
          className="md:col-span-5 text-sm max-h-140 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollBehavior: "smooth",
            scrollbarColor: "#d1d5dc",
          }}
        >
          {sortedElements?.map((x) => {
            const pageUrl = `${x.current_page.toString().split("?")[0].slice(0, -1)}`;
            const link = `https://${selectedSite}${pageUrl}`;

            const inpTextColor = getClsColor(x.inp_value, "color");
            const inpInsetColor = getClsColor(x.inp_value, "boxShadow");

            return (
              <button
                key={`${x.current_page}-${x.target_element}`}
                onClick={() => {
                  setActiveItem(x);
                  setAnalysisResult("");
                }}
                className={`w-full p-3 cursor-pointer text-left text-[13px] transition-colors ${
                  activeItem?.current_page === x.current_page &&
                  activeItem?.target_element === x.target_element
                    ? "bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                style={
                  activeItem?.current_page === x.current_page &&
                  activeItem?.target_element === x.target_element
                    ? inpInsetColor
                    : {}
                }
              >
                <div className="flex flex-col font-medium space-y-1 items-start">
                  <p className="uppercase text-primary/60">
                    INP:{" "}
                    <span style={inpTextColor}>{x.inp_value.toFixed(0)}</span>
                  </p>

                  <span className="flex cursor-pointer items-center gap-2 text-primary/80 hover:text-blue-400">
                    <a href={link} target="_blank" rel="nofollow">
                      {pageUrl}
                    </a>
                    <ExternalLink size={12} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* right side */}
        <div className="md:col-span-7 px-2 py-3">
          {activeItem !== null ? (
            <div className="space-y-1">
              <div className="flex gap-2 items-center">
                <p className="capitalize text-sm font-semibold text-primary/60">
                  {activeItem.interaction_type} Interaction{" "}
                  <span
                    className={`px-2 py-1 ml-1 rounded-xl text-[13px] border`}
                    style={{
                      ...getClsColor(
                        activeItem.inp_value,
                        "backgroundColor",
                        0.1,
                      ),
                      ...getPillTextColor(activeItem.inp_value),
                      ...getClsColor(activeItem.inp_value, "borderColor"),
                    }}
                  >
                    {activeItem.rating}
                  </span>
                </p>
              </div>
              <Link
                href={`https://${selectedSite}${activeItem.current_page}`}
                target="_blank"
                rel="nofollow"
                className="text-primary/60 hover:text-blue-400 cursor-pointer flex items-center gap-1 text-[13px] font-medium max-w-full truncate"
              >
                {`https://${selectedSite}${activeItem.current_page}`}
                <ExternalLink size={13} className="mb-0.5" />
              </Link>
              <div className="mt-4">
                <span className="flex font-semibold uppercase text-primary/50 text-xs items-center justify-between">
                  <p>Latency Breakdown</p>
                  <p>TOTAL {`${timeShare?.total}ms`}</p>
                </span>
                <div className="cursor-pointer bg-primary/10 h-2.5 rounded-xl mt-2 overflow-hidden flex">
                  <div
                    title="Input Delay"
                    className="h-full bg-purple-300"
                    style={{ width: `${timeShare?.input_delay_p || 0}%` }}
                  />

                  <div
                    title="Processing Duration"
                    className="h-full bg-yellow-300"
                    style={{
                      width: `${timeShare?.processing_duration_p || 0}%`,
                    }}
                  />

                  <div
                    title="Presentation Delay"
                    className="h-full bg-green-300"
                    style={{
                      width: `${timeShare?.presentation_delay_p || 0}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs mt-2 text-primary/80">
                  {items.map((X, index) => (
                    <div key={index}>
                      <p>{X.title}</p>
                      <p>{X.value?.toFixed(2)}ms</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 space-y-1 font-semibold uppercase text-primary/50 text-xs">
                <p>Target Element</p>
                <div className="px-4 py-3 text-xs lowercase rounded-sm bg-primary/10 border border-primary/20">
                  {activeItem.target_element === "(unknown)"
                    ? "Unknown target (possibly page scroll with mouse drag or touch)"
                    : activeItem.target_element}
                </div>
              </div>
              {activeItem.responsible_scripts !== null && (
                <div className="w-full text-primary/80 text-sm mt-6 py-2 border px-2 rounded-sm border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p>Assets observed during the INP event</p>
                      <CustomTooltip
                        content={`Assets observed during the INP event are important for debugging because they may contribute to input delay, long processing time, or delayed visual updates. Scripts executing on the main thread, large network requests, heavy style/layout calculations, or resource loading triggered around the interaction can block responsiveness and increase the final INP value.`}
                      />
                    </div>

                    <ChevronRight
                      onClick={() => {
                        setDropDownOpen((prev) => !prev);
                      }}
                      className={`${dropDownOpen ? "rotate-45 transition-all duration-300" : "rotate-0 transition-all duration-300"} cursor-pointer`}
                      size={14}
                    />
                  </div>
                  {dropDownOpen && (
                    <div className="mt-2 space-y-2">
                      {activeItem.responsible_scripts
                        ?.split(",")
                        .map((x) => x.trim())
                        .filter(Boolean)
                        .map((script, index) => {
                          let formattedScript = script;

                          try {
                            const url = new URL(script);

                            if (url.hostname === selectedSite) {
                              formattedScript =
                                url.pathname + url.search + url.hash;
                            }
                          } catch {
                            // keep original if invalid URL
                          }

                          return (
                            <div
                              key={`${script}-${index}`}
                              className="group flex items-start gap-2 rounded-sm border border-primary/10 bg-primary/80 px-2 py-1 text-xs font-mono text-primary-foreground/80 transition-all hover:bg-primary/70"
                            >
                              <span className="break-all leading-relaxed">
                                {formattedScript}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => {
                  setAnalysing(activeItem.current_page);
                  AnalyzeInpElement(activeItem);
                  setAnalysisResult("");
                }}
                className="rounded-sm cursor-pointer mt-6 bg-purple-600 text-xs px-3 py-1 hover:bg-purple-800 text-primary-foreground font-medium flex gap-2 items-center"
              >
                <StarsIcon
                  size={14}
                  className={`fill-yellow-200 ${analysing === activeItem.current_page ? "animate-spin duration-500" : ""}`}
                />
                {analysing === activeItem.current_page
                  ? "Analyzing..."
                  : "Analyze INP"}
              </button>
              {parsedLines.length > 0 && (
                <div className="space-y-2 mt-3">
                  {parsedLines.map((line, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-sm border border-primary/10 bg-primary/5 text-sm text-primary/80"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-primary/60 text-sm">
              Please select an item on the left
            </div>
          )}
        </div>
      </div>
    </div>
  );

  async function AnalyzeInpElement(data: InpElementType) {
    setAnalysing(data.current_page);

    const res = await fetch("/api/analysis/inp/contributors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metric: "INP",
        data,
      }),
    });

    if (!res.body) {
      setAnalysing(null);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith("data:")) continue;

        const json = trimmed.replace("data:", "").trim();

        if (json === "[DONE]") continue;

        try {
          const parsed = JSON.parse(json);
          const token = parsed.choices?.[0]?.delta?.content ?? "";

          if (token) {
            setAnalysisResult((prev) => prev + token);
          }
        } catch (err) {
          console.error("PARSE ERROR", err);
        }
      }
    }

    setAnalysing(null);
  }
}

const getClsColor = (
  score: number,
  property: "color" | "backgroundColor" | "boxShadow" | "borderColor",
  backgourndOpacity?: number,
) => {
  function hexToRgba(hex: string, backgourndOpacity: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${backgourndOpacity})`;
  }

  const colorEquation =
    score >= 500 ? THEME.red : score >= 200 ? THEME.orange : THEME.green;

  const color = {
    color: `${colorEquation}`,
  };

  const backgroundColor = {
    backgroundColor: `${backgourndOpacity ? hexToRgba(colorEquation, backgourndOpacity) : colorEquation}`,
  };

  const boxShadow = {
    boxShadow: `inset 4px 0 0 0 ${colorEquation}`,
  };

  const borderColor = {
    borderColor: `${colorEquation}`,
  };

  switch (property) {
    case "color":
      return color;
    case "backgroundColor":
      return backgroundColor;
    case "boxShadow":
      return boxShadow;
    case "borderColor":
      return borderColor;
  }
};

const getPillTextColor = (score: number) => {
  const colorCode =
    score >= 500 ? THEME.red : score >= 200 ? THEME.orange : THEME.green;

  return {
    color: colorCode,
  };
};
