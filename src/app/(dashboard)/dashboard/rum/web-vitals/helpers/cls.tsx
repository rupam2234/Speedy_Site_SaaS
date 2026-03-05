"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Layout,
  Info,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Monitor,
  Tablet,
  Layers,
  CopyCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import TooltipIcon from "@/components/theme/customTooltip";
import { useSiteContext } from "../../../siteContext";

interface CLSContributor {
  current_page: string;
  device_type: string;
  largest_shift_target: string;
  cls_value: number;
  cls_timestamp: string | null;
}

const getClsStatus = (val: number) => {
  if (val <= 0.1) return { color: "text-emerald-500", label: "Good" };
  if (val <= 0.25)
    return { color: "text-amber-500", label: "Needs Improvement" };
  return { color: "text-rose-500", label: "Poor" };
};

const getClsDiagnosis = (target: string, value: number) => {
  const t = target?.toLowerCase();

  if (value <= 0.1)
    return {
      text: "Layout is stable.",
      icon: <CheckCircle2 size={14} className="text-emerald-500" />,
    };

  if (!target)
    return {
      text: "Invisible shift. Check for late-loading web fonts or global CSS overrides.",
      icon: <AlertCircle size={14} className="text-rose-500" />,
    };

  if (t.includes("header") || t.includes("nav"))
    return {
      text: "Header shift. Ensure navigation bar height is reserved in CSS.",
      icon: <Info size={14} className="text-amber-500" />,
    };

  if (t.includes("ad-box") || t.includes("mv-rail"))
    return {
      text: "Ad-related shift. Use a placeholder div with a fixed minimum height.",
      icon: <AlertCircle size={14} className="text-rose-500" />,
    };

  if (t.includes("img") || t.includes("figure") || t.includes("wp-block-image"))
    return {
      text: "Image shift. Ensure <img> tags have explicit width and height attributes.",
      icon: <Info size={14} className="text-amber-500" />,
    };

  if (t.includes("jarallax") || t.includes("row-layout"))
    return {
      text: "Structural row shift. Check background effect initialization scripts.",
      icon: <Layers size={14} className="text-rose-500" />,
    };

  if (t.includes("p") || t.includes("content"))
    return {
      text: "Text shift. Check for dynamic content injection or late font-swapping (FOIT/FOUT).",
      icon: <Info size={14} className="text-amber-500" />,
    };

  return {
    text: "Layout instability. Review dynamic elements loading above this target.",
    icon: <AlertCircle size={14} className="text-rose-500" />,
  };
};

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case "mobile":
      return <Smartphone size={12} />;
    case "tablet":
      return <Tablet size={12} />;
    default:
      return <Monitor size={12} />;
  }
};

// main component

export default function CLSElements({
  contributors,
}: {
  contributors: CLSContributor[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const { selectedSite } = useSiteContext();

  const filtered = useMemo(
    () =>
      contributors.filter(
        (c) =>
          c.largest_shift_target
            ?.toLowerCase()
            .includes(search?.toLowerCase()) ||
          c.current_page?.toLowerCase().includes(search?.toLowerCase()),
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
            placeholder="Search by selector or URL..."
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
            {[5, 10, 20].map((n) => (
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
          const status = getClsStatus(item.cls_value);
          const diagnosis = getClsDiagnosis(
            item.largest_shift_target,
            item.cls_value,
          );

          return (
            <div key={i} className="py-5 group">
              <div className="flex items-start gap-8">
                {/* 1. CLS Score */}
                <div className="w-20 shrink-0">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                    Shift Score
                  </div>
                  <div
                    className={`text-xl font-mono font-bold leading-none ${status.color}`}
                  >
                    {item.cls_value.toFixed(3)}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] mt-2 font-bold opacity-50 uppercase tracking-tighter">
                    <DeviceIcon type={item.device_type} />
                    {item.device_type}
                  </div>
                </div>

                {/* 2. Target Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Layout size={14} className="text-muted-foreground/60" />
                    {item.largest_shift_target ? (
                      <code className="bg-muted/50 px-1.5 py-0.5 rounded text-[12px] font-mono truncate max-w-xl border border-primary/5">
                        {item.largest_shift_target}
                      </code>
                    ) : (
                      <span className="text-muted-foreground italic text-[12px]">
                        Undefined target (Global shift)
                      </span>
                    )}

                    {item.largest_shift_target && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            item.largest_shift_target,
                          );
                          toast.success("Copied selector", {
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

                  <div className="flex items-center gap-3 text-muted-foreground text-[12px]">
                    <span className="truncate max-w-100">
                      {item.current_page}
                    </span>
                    <Link
                      href={`https://${selectedSite}${item.current_page}`}
                      target="_blank"
                      className="hover:text-primary transition-colors"
                    >
                      <ExternalLink size={11} />
                    </Link>
                  </div>
                </div>

                <TooltipIcon
                  content={
                    <div className="flex items-center gap-2.5 ">
                      <span>{diagnosis.text}</span>
                    </div>
                  }
                  trigger={
                    <Info
                      size={14}
                      className="text-primary/60 hover:text-primary/20 cursor-help"
                    />
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
