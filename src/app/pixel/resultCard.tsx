"use client";

import React from "react";
import { Download, Zap, CheckCircle2, Info } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ConversionResult {
  format: string;
  size: number;
  url: string;
  savings: number;
  loadingTime: number; // estimated in ms for 3G
}

interface ResultCardProps {
  result: ConversionResult;
  originalSize: number;
}

export function ResultCard({ result, originalSize }: ResultCardProps) {
  const isSmaller = result.size < originalSize;
  const savingsPercent = ((originalSize - result.size) / originalSize) * 100;
  const isSignificant = savingsPercent > 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-md border p-6 shadow-sm transition-all",
        isSmaller
          ? "border-slate-200 hover:shadow-md"
          : "border-amber-100 bg-amber-50/30",
      )}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-900 uppercase tracking-tight">
              {result.format}
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              {(result.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>

        {isSmaller ? (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase",
              isSignificant
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-600",
            )}
          >
            <CheckCircle2 className="w-3 h-3" />
            {savingsPercent.toFixed(0)}% Saved
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase">
            <Info className="w-3 h-3" />+{Math.abs(savingsPercent).toFixed(0)}%
            Larger
          </div>
        )}
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Est. Load Time (3G)
          </span>
          <span className="font-mono text-slate-700">
            {result.loadingTime}ms
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min(100, (result.size / originalSize) * 100)}%`,
            }}
            className={`h-full rounded-full ${isSmaller ? "bg-emerald-500" : "bg-amber-400"}`}
          />
        </div>
      </div>

      <a
        href={result.url}
        download={`optimized-image.${result.format}`}
        className={cn(
          "flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium transition-all group",
          isSmaller
            ? "bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200"
            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
        )}
      >
        <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
        Download {result.format.toUpperCase()}
      </a>

      {!isSmaller && result.format === "png" && (
        <p className="mt-3 text-[11px] text-amber-600 leading-tight">
          PNG is lossless. For photos, try WebP for better compression.
        </p>
      )}
    </motion.div>
  );
}
