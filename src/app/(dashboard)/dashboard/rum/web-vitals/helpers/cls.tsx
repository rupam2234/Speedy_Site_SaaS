"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Smartphone,
  Monitor,
  ArrowDown,
  ArrowUp,
  MousePointer2,
  Copy,
  Layers,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Bug,
  ExternalLinkIcon,
  StarsIcon,
  TabletIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSiteContext } from "../../../siteContext";
import { CustomTooltip, LoadingAnimation, THEME } from "@/components/theme";
import { clsAnalysisType } from "@/app/api/analysis/cls/contributors/route";

export type CLSMetricEntry = {
  cls_score: number;
  current_page: string;
  dev_type: string;
  impact_json: { distanceMoved?: number };
  involved_elems: Record<string, number> | string[];
  l_mode: string;
  most_frequent_element: string;
  occ_count: number;
  rect_json: any;
  shift_json: { dx: number; dy: number };
  time_avg: number;
};

type PageGroup = {
  url: string;
  maxScore: number;
  shifts: CLSMetricEntry[];
};

export default function CLSPageInsightsAdvanced({
  contributors = [],
}: {
  contributors: CLSMetricEntry[];
}) {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [activeShiftIdx, setActiveShiftIdx] = useState(0);
  const [showInvolved, setShowInvolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const { selectedSite } = useSiteContext();

  const pageGroups = useMemo(() => {
    const groups: Record<string, PageGroup> = {};
    contributors.forEach((c) => {
      if (!groups[c.current_page]) {
        groups[c.current_page] = {
          url: c.current_page,
          maxScore: 0,
          shifts: [],
        };
      }
      groups[c.current_page].shifts.push(c);
      groups[c.current_page].maxScore = Math.max(
        groups[c.current_page].maxScore,
        c.cls_score,
      );
    });
    return Object.values(groups).sort((a, b) => b.maxScore - a.maxScore);
  }, [contributors]);

  useEffect(() => {
    if (pageGroups.length > 0) {
      setActiveUrl(pageGroups[0].url);
      setLoading(false);
    } else {
      const t = setTimeout(() => setLoading(false), 3000);
      return () => clearTimeout(t);
    }
  }, [pageGroups]);

  const activeGroup = pageGroups.find((g) => g.url === activeUrl);
  const activeShift = activeGroup?.shifts[activeShiftIdx];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Selector copied", {
      description: "Element is ready to paste.",
      duration: 2000,
      style: {
        color: "white",
        backgroundColor: "black",
      },
    });
  };

  const involvedArray = useMemo(() => {
    if (!activeShift?.involved_elems) return [];
    if (Array.isArray(activeShift.involved_elems))
      return activeShift.involved_elems;
    return Object.keys(activeShift.involved_elems);
  }, [activeShift]);

  const parsedLines = useMemo(() => {
    return analysisResult
      ?.split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^•\s?/, ""));
  }, [analysisResult]);

  if (loading) return <LoadingAnimation />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
      {/* LEFT: Wide URL Sidebar */}
      <div className="lg:col-span-5  border-neutral-200 dark:border-neutral-800 ">
        <div
          className="overflow-y-auto max-h-200 divide-y divide-neutral-100 dark:divide-neutral-800"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#fffff",
            scrollBehavior: "smooth",
          }}
        >
          {pageGroups.map((group) => {
            return (
              <button
                key={group.url}
                onClick={() => {
                  setActiveUrl(group.url);
                  setActiveShiftIdx(0);
                  setAnalyzing(false);
                  setAnalysisResult("");
                  setShowInvolved(false);
                }}
                className={`w-full cursor-pointer text-left p-4 transition-all flex items-start gap-4}`}
                style={
                  activeUrl === group.url
                    ? getBoxShadowColor(group.maxScore)
                    : {}
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                    Layout Shift:{" "}
                    <span
                      style={getClsColor(group.maxScore, "color")}
                      className=""
                    >
                      {group.maxScore.toFixed(3)}
                    </span>
                  </div>
                  <div
                    className={`text-xs font-mono break-all leading-relaxed ${activeUrl === group.url ? "text-primary font-bold" : "text-neutral-600 dark:text-neutral-400"}`}
                  >
                    {group.url}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Detail & Diagnostics */}
      <div className="lg:col-span-7 flex flex-col">
        {activeGroup && activeShift ? (
          <div className="flex flex-col h-full">
            {/* Page Header */}
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                Page
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-mono text-neutral-800 dark:text-neutral-200 truncate">
                  {activeGroup.url}
                </div>
                <CustomTooltip
                  content={
                    <div className="space-y-3 text-sm">
                      <p>
                        To identify layout shifts on your page, you can use the{" "}
                        <Link
                          className="text-blue-300 hover:text-blue-400"
                          href={"#"}
                        >
                          Layout Shift Highlighter
                        </Link>{" "}
                        extension, that helps you either detect shifted elements
                        in real time or review all elements we&apos;ve
                        identified on the page during user sessions.
                      </p>
                      <p>
                        After installing the extension you can follow the link
                        below to instantly debug the elements with layout shift
                        on the page.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            window.open(
                              `https://${selectedSite}${activeShift.current_page}`,
                              "_blank",
                            );
                          }}
                          className="flex items-center gap-2 px-2 py-0.5 rounded-xs bg-primary-foreground/20 hover:bg-primary-foreground/40"
                        >
                          Go to page <ExternalLinkIcon size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (!selectedSite) return;

                            const involved =
                              (activeShift.involved_elems as any)?.map(
                                (x: string) => {
                                  const { className, tag } = parseFromDom(x);

                                  return `${tag}.${className?.split(" ").join(".")}`;
                                },
                              ) || [];

                            const debugUrl = prepareDebugUrl({
                              domain: selectedSite,
                              elements: involved,
                              page: activeShift.current_page,
                            });

                            window.open(debugUrl, "_blank"); // oepn in new tab
                          }}
                          className="flex items-center gap-2 px-2 py-0.5 rounded-xs bg-primary-foreground/20 hover:bg-primary-foreground/40"
                        >
                          Debug CLS
                          <ExternalLinkIcon size={14} />
                        </button>
                      </div>
                    </div>
                  }
                  trigger={
                    // <Link
                    //   href={`https://${selectedSite}${activeGroup.url}`}
                    //   target="_blank"
                    //   className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg shrink-0"
                    // >
                    //   <ExternalLink size={14} />
                    // </Link>
                    <Bug
                      size={27}
                      className="fill-primary/30 text-primary/80 p-1 hover:bg-primary/10 rounded-lg"
                    />
                  }
                />
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Elements List */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Shifted Elements
                </h4>
                {activeGroup.shifts.map((shift, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-sm border transition-all overflow-hidden ${activeShiftIdx === idx ? "border-primary/30 bg-primary/5" : "border-neutral-100 dark:border-neutral-800 hover:border-neutral-300"}`}
                  >
                    <div className="w-full flex items-center justify-between p-4 text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg ${activeShiftIdx === idx ? "bg-primary dark:bg-primary-foreground dark:text-primary text-primary-foreground" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"}`}
                        >
                          {shift.dev_type === "mobile" ? (
                            <Smartphone size={14} />
                          ) : shift.dev_type === "desktop" ? (
                            <Monitor size={14} />
                          ) : (
                            <TabletIcon size={14} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`text-[11px] font-mono truncate max-w-70 ${activeShiftIdx === idx ? "text-primary font-bold" : "text-neutral-700 dark:text-neutral-300"}`}
                          >
                            {shift.most_frequent_element}
                          </div>
                          <div className="text-[9px] text-neutral-400 font-bold uppercase mt-1">
                            {shift.l_mode} • {shift.occ_count} Events
                          </div>
                        </div>
                      </div>
                      <div
                        className="ml-4 font-mono font-bold text-sm"
                        style={getClsColor(
                          Number(shift.cls_score.toFixed(3)),
                          "color",
                        )}
                      >
                        {shift.cls_score.toFixed(3)}
                      </div>
                    </div>

                    {/* Integrated Selector Tools */}
                    <div className="flex items-center gap-2 px-4 pb-3">
                      <button
                        onClick={() => handleCopy(shift.most_frequent_element)}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-primary-foreground/80 dark:text-primary/80 cursor-pointer hover:text-primary-foreground transition-colors bg-primary dark:bg-primary-foreground px-2 py-1 rounded"
                      >
                        <Copy size={12} /> Copy Selector
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Movement Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Vertical Shift */}
                <div className="p-3 rounded-sm border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                  <div className="text-[10px] uppercase text-neutral-400 mb-1">
                    Vertical Shift
                  </div>
                  <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                    {activeShift.shift_json.dy !== 0 ? (
                      <>
                        {activeShift.shift_json.dy > 0 ? (
                          <ArrowDown className="text-red-500" size={14} />
                        ) : (
                          <ArrowUp className="text-emerald-500" size={14} />
                        )}
                        {Math.abs(activeShift.shift_json.dy).toFixed(1)}px
                      </>
                    ) : (
                      <span className="text-neutral-400 text-xs">0.0px</span>
                    )}
                  </div>
                </div>

                {/* Horizontal Shift */}
                <div className="p-3 rounded-sm border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                  <div className="text-[10px] uppercase text-neutral-400 mb-1">
                    Horizontal Shift
                  </div>
                  <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                    {activeShift.shift_json.dx !== 0 ? (
                      <>
                        {activeShift.shift_json.dx > 0 ? (
                          <ArrowRight className="text-red-500" size={14} />
                        ) : (
                          <ArrowLeft className="text-emerald-500" size={14} />
                        )}
                        {Math.abs(activeShift.shift_json.dx).toFixed(1)}px
                      </>
                    ) : (
                      <span className="text-neutral-400 text-xs">0.0px</span>
                    )}
                  </div>
                </div>

                {/* Distance Moved */}
                <div className="p-3 rounded-sm border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                  <div className="text-[10px] uppercase text-neutral-400 mb-1">
                    Total Distance Moved
                  </div>
                  <div className="font-mono text-sm font-semibold flex items-center gap-2">
                    <Layers className="text-primary" size={14} />
                    {(activeShift.impact_json?.distanceMoved || 0).toFixed(1)}px
                  </div>
                </div>
              </div>

              {/* Involved Elements */}
              {involvedArray.length > 0 && (
                <div className="border rounded-sm bg-primary/90 dark:bg-secondary-background overflow-hidden">
                  <button
                    onClick={() => setShowInvolved(!showInvolved)}
                    className="w-full flex items-center justify-between p-4 text-left group"
                  >
                    <div className="flex items-center gap-2 text-amber-300 dark:text-amber-500 font-bold text-[10px] uppercase">
                      <Layers size={14} /> Shift Cluster ({involvedArray.length}{" "}
                      Elements)
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-amber-500 transition-transform ${showInvolved ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showInvolved && (
                    <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <p className="text-[11px] text-primary-foreground/80 mb-3 italic">
                        Elements that are also contributing to Cumulative Layout
                        Shift (CLS) on this page.
                      </p>
                      {involvedArray.map((el, i) => {
                        const compile = parseFromDom(el);
                        const compiledElement = `${compile.tag}.${compile.className?.split(" ").join(".")}`;

                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between group/item p-2 rounded bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800"
                          >
                            <code className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400 truncate max-w-[80%]">
                              {compiledElement}
                            </code>
                            <button
                              onClick={() => handleCopy(compiledElement)}
                              className="opacity-0 group-hover/item:opacity-100 p-1 hover:text-primary transition-all"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Recommendation */}
              <button
                onClick={() => {
                  analyzeClsElements(activeShift);
                }}
                disabled={analysisResult.length > 0}
                className="rounded-sm bg-purple-600 text-xs px-3 py-1 cursor-pointer hover:bg-purple-800 text-primary-foreground font-medium flex gap-2 items-center"
              >
                <StarsIcon
                  size={14}
                  className={`fill-yellow-200 ${isAnalyzing ? "animate-spin duration-500" : ""}`}
                />
                {isAnalyzing && analysisResult.length === 0
                  ? "Analyzing..."
                  : "Analyze CLS data"}
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
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-neutral-300">
            <MousePointer2 size={32} className="mb-4 opacity-20" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Select a route to begin audit
            </span>
          </div>
        )}
      </div>
    </div>
  );

  async function analyzeClsElements<T>(data: CLSMetricEntry) {
    if (!activeShift || isAnalyzing) {
      return;
    }

    try {
      setAnalyzing(true);

      const res = await fetch("/api/analysis/cls/contributors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metric: "CLS",
          data: data,
        } as clsAnalysisType<T>),
      });

      if (!res.ok) {
        throw new Error("Unable to get result");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const x = await reader?.read();

        if (x?.done) {
          setAnalyzing(false);
          break;
        }

        buffer += decoder.decode(x?.value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        // data comes as  ---
        // data: {"choices":[{"delta":{"content":"Hello"}}]}
        // data: {"choices":[{"delta":{"content":" world"}}]}

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const json = trimmed.replace("data:", "").trim();

          if (json === "[DONE]") continue;

          const parsed = JSON.parse(json);
          const token = parsed.choices?.[0]?.delta?.content ?? "";

          if (!token) {
            // setAnalyzing(false);
            // throw new Error("PARSE ERROR");
            continue;
          }

          setAnalysisResult((prev) => (prev || "") + token);
        }
      }
    } catch (error: any) {
      setAnalysisResult("");
      setAnalyzing(false);
      console.error(error ?? "Unexpacted error");
    }

    // retry ? optional
  }
}

const getBoxShadowColor = (score: number) => {
  if (score >= 0.1) return { boxShadow: `inset 4px 0 0 0 ${THEME.red}` };
  if (score >= 0.05) return { boxShadow: `inset 4px 0 0 0 ${THEME.orange}` };
  return { boxShadow: `inset 4px 0 0 0 ${THEME.green}` };
};

const getClsColor = (score: number, property: "color" | "backgroundColor") => {
  const color =
    score >= 0.1 ? THEME.red : score >= 0.05 ? THEME.orange : THEME.green;

  if (property === "color") {
    return {
      color: `${color}`,
    };
  }

  return {
    [property]: color,
  };
};

function parseFromDom(dom: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(dom, "text/html");
  const tag = doc.body.firstElementChild?.tagName.toLowerCase() || null;
  const className = doc.body.firstElementChild?.className || null;

  return { tag, className };
}

function prepareDebugUrl({
  domain,
  page,
  elements,
}: {
  domain: string;
  page: string;
  elements: string[];
}) {
  return `https://${domain}${page}?cls=${elements.map((x, index) => `${x}${index !== elements.length - 1 ? "" : ","}`)}`;
}
