"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  ImageIcon,
  Type,
  CopyCheckIcon,
} from "lucide-react";
import { toast } from "sonner";

const getVitalStatus = (ms: number) => {
  if (ms <= 2500) return { color: "text-emerald-500", label: "Good" };
  if (ms <= 4000)
    return { color: "text-amber-500", label: "Needs Improvement" };
  return { color: "text-[#ff6467]", label: "Poor" };
};

export default function LCPelements({
  contributors,
}: {
  contributors: Contributor[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);

  const filtered = useMemo(
    () =>
      contributors.filter(
        (c) =>
          c.element_target.toLowerCase().includes(search.toLowerCase()) ||
          c.page_url.toLowerCase().includes(search.toLowerCase()),
      ),
    [contributors, search],
  );

  const totalPages = Math.ceil(filtered.length / rows) || 1;
  const activeItems = filtered.slice((page - 1) * rows, page * rows);

  return (
    <div className="w-full text-[13px] text-foreground/80 font-sans">
      {/* Search & Pagination Header */}
      <div className="flex items-center justify-between py-3 border-b border-primary/5">
        <div className="flex items-center gap-3 flex-1">
          <Search size={14} className="text-muted-foreground" />
          <input
            placeholder="Filter worse elements or URLs..."
            className="bg-transparent outline-none w-full max-w-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-6 text-muted-foreground">
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

      {/* Table Body */}
      <div className="divide-y divide-primary/5">
        {activeItems.map((item, i) => {
          const lcpVital = getVitalStatus(item.avg_lcp_value);

          return (
            <div key={i} className="py-5 group">
              <div className="flex items-start gap-8">
                {/* 1. The Value */}
                <div className="w-20 shrink-0">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                    LCP
                  </div>
                  <div
                    className={`text-xl font-mono font-bold leading-none ${lcpVital.color}`}
                  >
                    {(item.avg_lcp_value / 1000).toFixed(2)}s
                  </div>
                  <div className="text-[10px] mt-2 font-medium opacity-50 uppercase tracking-tighter">
                    {item.device_type}
                  </div>
                </div>

                {/* 2. The Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {item.image_url ? (
                      <ImageIcon
                        size={14}
                        className="text-muted-foreground/60"
                      />
                    ) : (
                      <Type size={14} className="text-muted-foreground/60" />
                    )}
                    <code className="bg-muted/50 px-1.5 py-0.5 rounded text-[12px] font-mono truncate max-w-xl border border-primary/5">
                      {item.element_target}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.element_target);
                        toast.success("Copied", {
                          duration: 2500,
                          style: { background: "#53a94a", color: "#f8f3e1" },
                          icon: <CopyCheckIcon size={16} />,
                        });
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="truncate max-w-75">{item.page_url}</span>
                    {item.image_url && (
                      <Link
                        href={item.image_url}
                        target="_blank"
                        className="hover:text-primary flex items-center gap-1"
                      >
                        <ExternalLink size={11} /> source
                      </Link>
                    )}
                    <span className="text-[11px] tabular-nums">
                      ({item.occurrence_count} samples)
                    </span>
                  </div>
                </div>

                {/* 3. The Breakdown */}
                <div className="hidden md:flex gap-6 shrink-0 border-l border-primary/5 pl-8">
                  <MetricItem
                    label="Delay"
                    val={item.avg_resource_load_delay}
                  />
                  <MetricItem
                    label="Load"
                    val={item.avg_resource_load_duration}
                  />
                  <MetricItem
                    label="Render"
                    val={item.avg_element_render_delay}
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

function MetricItem({ label, val }: { label: string; val: number | null }) {
  const color = !val
    ? "text-muted-foreground/20"
    : val > 500
      ? "text-rose-400"
      : "text-foreground/70";
  return (
    <div className="flex flex-col w-12">
      <span className="text-[10px] font-bold text-muted-foreground/50 uppercase mb-1">
        {label}
      </span>
      <span className={`font-mono text-[12px] font-bold ${color}`}>
        {val ? `${(val / 1000).toFixed(2)}s` : "—"}
      </span>
    </div>
  );
}

interface Contributor {
  device_type: string;
  element_target: string;
  page_url: string;
  image_url: string | null;
  occurrence_count: number;
  avg_lcp_value: number;
  avg_resource_load_delay: number | null;
  avg_resource_load_duration: number | null;
  avg_element_render_delay: number | null;
}
