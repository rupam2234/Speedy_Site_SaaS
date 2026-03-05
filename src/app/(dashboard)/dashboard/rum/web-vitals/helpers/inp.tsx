"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  Layout,
  Info,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Monitor,
  Tablet,
  Zap,
  CopyCheckIcon,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import TooltipIcon from "@/components/theme/customTooltip";

interface INPContributor {
  device_type: string;
  interaction_type: string;
  affected_element: string;
  occurrence_count: number;
  avg_inp_value: number;
  min_inp_value: number;
  max_inp_value: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}

const getInpStatus = (val: number) => {
  if (val <= 200) return { color: "text-emerald-500", label: "Good" };
  if (val <= 500)
    return { color: "text-amber-500", label: "Needs Improvement" };
  return { color: "text-rose-500", label: "Poor" };
};

const getInpDiagnosis = (
  element: string,
  interaction: string,
  value: number,
) => {
  const el = element?.toLowerCase() || "";

  if (value <= 200)
    return {
      text: "Responsive interaction. No action needed.",
      icon: <CheckCircle2 size={14} className="text-emerald-500" />,
    };

  if (el.includes("adthrive") || el.includes("ad-"))
    return {
      text: "Ad-related delay. Third-party ad scripts are blocking the main thread during interaction.",
      icon: <AlertCircle size={14} className="text-rose-500" />,
    };

  if (el.includes("wprm-recipe") || el.includes("recipe"))
    return {
      text: "Recipe plugin interaction. Check for heavy JavaScript execution in recipe buttons/calculators.",
      icon: <Zap size={14} className="text-amber-500" />,
    };

  if (el.includes("slick") || el.includes("carousel"))
    return {
      text: "Carousel delay. Slider initialization or slide transitions are consuming too many CPU cycles.",
      icon: <Zap size={14} className="text-rose-500" />,
    };

  if (el.includes("input") || el.includes("search"))
    return {
      text: "Input delay. Large event listeners or synchronous validation is blocking the UI thread.",
      icon: <Info size={14} className="text-amber-500" />,
    };

  if (el.includes("menu") || el.includes("toggle"))
    return {
      text: "Navigation delay. Complex CSS layouts or heavy JS is triggered when opening the menu.",
      icon: <AlertCircle size={14} className="text-amber-500" />,
    };

  return {
    text: "Main thread bottleneck. Minimize long tasks or break up JavaScript execution.",
    icon: <HelpCircle size={14} className="text-rose-500" />,
  };
};

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case "mobile":
    case "phone":
      return <Smartphone size={12} />;
    case "tablet":
      return <Tablet size={12} />;
    default:
      return <Monitor size={12} />;
  }
};

export default function INPelements({
  contributors,
}: {
  contributors: INPContributor[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);

  const filtered = useMemo(
    () =>
      contributors.filter(
        (c) =>
          c.affected_element?.toLowerCase().includes(search?.toLowerCase()) ||
          c.interaction_type?.toLowerCase().includes(search?.toLowerCase()),
      ),
    [contributors, search],
  );

  const totalPages = Math.ceil(filtered.length / rows) || 1;
  const activeItems = filtered.slice((page - 1) * rows, page * rows);

  return (
    <div className="w-full text-[13px] text-foreground/80 font-sans">
      {/* Header Controls */}
      <div className="flex items-center justify-between py-3 border-b border-primary/5">
        <div className="flex items-center gap-3 flex-1">
          <Search size={14} className="text-muted-foreground" />
          <input
            placeholder="Search by element or interaction..."
            className="bg-transparent outline-none w-full max-w-xs placeholder:text-muted-foreground/50"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-6 text-muted-foreground font-medium">
          <select
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
            className="bg-transparent outline-none cursor-pointer hover:text-foreground"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} rows
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="disabled:opacity-20 hover:text-foreground transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-mono tabular-nums">
              {page}/{totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="disabled:opacity-20 hover:text-foreground transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-primary/5">
        {activeItems.map((item, i) => {
          const status = getInpStatus(item.avg_inp_value);
          const diagnosis = getInpDiagnosis(
            item.affected_element,
            item.interaction_type,
            item.avg_inp_value,
          );

          return (
            <div key={i} className="py-5 group">
              <div className="flex items-start gap-8">
                {/* 1. INP Score */}
                <div className="w-24 shrink-0">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                    Avg Latency
                  </div>
                  <div
                    className={`text-xl font-mono font-bold leading-none ${status.color}`}
                  >
                    {Math.round(item.avg_inp_value)}
                    <span className="text-[12px] ml-0.5">ms</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] mt-2 font-bold opacity-50 uppercase tracking-tighter">
                    <DeviceIcon type={item.device_type} />
                    {item.device_type}
                  </div>
                </div>

                {/* 2. Element Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Layout size={14} className="text-muted-foreground/60" />
                    {item.affected_element &&
                    item.affected_element !== "unknown" ? (
                      <code className="bg-muted/50 px-1.5 py-0.5 rounded text-[12px] font-mono truncate max-w-xl border border-primary/5">
                        {item.affected_element}
                      </code>
                    ) : (
                      <span className="text-muted-foreground italic text-[12px]">
                        Global interaction (Window/Body)
                      </span>
                    )}

                    {item.affected_element && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.affected_element);
                          toast.success("Copied element selector", {
                            duration: 2500,
                            style: { background: "#53a94a", color: "#f8f3e1" },
                            icon: <CopyCheckIcon size={16} />,
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-muted-foreground text-[11px] font-medium uppercase tracking-tight">
                    <div className="flex items-center gap-1">
                      <Zap size={11} />
                      Total Samples: {item.occurrence_count}
                    </div>
                    <div className="flex items-center gap-1 text-rose-400/80">
                      Peak: {item.max_inp_value}ms
                    </div>
                  </div>
                </div>

                {/* 3. Diagnosis Tooltip */}
                <div className="flex items-center gap-3 self-center">
                  <TooltipIcon
                    content={
                      <div className="max-w-xs">
                        <p className="font-bold mb-1 border-b border-white/10 pb-1">
                          INP Diagnosis
                        </p>
                        <p className="text-[12px] leading-relaxed">
                          {diagnosis.text}
                        </p>
                      </div>
                    }
                    trigger={
                      <div className="p-2 hover:bg-primary/5 rounded-full transition-colors cursor-help">
                        {diagnosis.icon}
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
