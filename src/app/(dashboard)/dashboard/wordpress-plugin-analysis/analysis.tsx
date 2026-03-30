"use client";

import {
  AlertTriangle,
  Cpu,
  Database,
  Globe,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { PluginAnalysis } from "./types";
import { useMemo } from "react";

interface PluginAnalysisProps {
  analysisResult: PluginAnalysis[];
  loading: boolean;
}

export default function AnalysisDashboard({
  analysisResult,
  loading,
}: PluginAnalysisProps) {
  // plugins with higher impact score than 4
  const impactfulPlugins = useMemo(() => {
    const total = analysisResult?.length || 0;
    if (!total) return 0;

    const impactful = analysisResult.filter((p) => p.impactScore > 4).length;
    return (impactful / total) * 100;
  }, [analysisResult]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="relative">
          <RefreshCw className="animate-spin text-primary/40" size={48} />
          <Cpu
            className="absolute top-1/2 left-1/2 -tranprimary-x-1/2 -tranprimary-y-1/2 opacity-40"
            size={20}
          />
        </div>
        <p className="mt-6 font-mono uppercase tracking-[0.3em] text-xs opacity-50 animate-pulse">
          Analyzing Plugins...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-6">
      {!loading && analysisResult.length > 0 && (
        <>
          {/* overview section */}
          <OverviewSection
            analysisResult={analysisResult}
            impactfulPlugins={impactfulPlugins}
          />
          {/* plugin section */}
          <PluginResult analysisResult={analysisResult} />
        </>
      )}
    </div>
  );
}

function OverviewSection({
  analysisResult,
  impactfulPlugins,
}: {
  analysisResult: PluginAnalysis[];
  impactfulPlugins: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="p-6 border border-primary/20 bg-primary-foreground dark:bg-secondary-background">
        <p className="text-[12px] uppercase mb-1">
          Plugins Detected In Your WordPress site
        </p>
        <p className="text-4xl text-primary/80 font-bold">
          {analysisResult.length}
        </p>
      </div>
      <div className="p-6 border border-primary/20 bg-primary-foreground dark:bg-secondary-background">
        <p className="text-[12px] uppercase mb-1">
          Plugins with an impact score above 4/10
        </p>
        <p
          className={`text-4xl uppercase font-bold ${impactfulPlugins > 90 ? "text-[#ff6467]" : impactfulPlugins > 40 ? "text-[#FCBF49]" : "text-[#53a94a]"}`}
        >
          {impactfulPlugins.toFixed(0)}% heavy
        </p>
      </div>
      <div className="p-6 border border-primary/20 bg-primary-foreground dark:bg-secondary-background">
        <p className="text-[12px] uppercase  mb-1">Audit Type</p>
        <p className="text-4xl font-bold text-primary/80 uppercase tracking-tighter">
          Single SCAN
        </p>
      </div>
    </div>
  );
}

function PluginResult({
  analysisResult,
}: {
  analysisResult: PluginAnalysis[];
}) {
  return (
    <div className="space-y-6">
      {/* Results List */}
      <div className="space-y-4">
        {analysisResult.map((item, idx) => (
          <div
            key={idx}
            className="group relative bg-primary-foreground/80 hover:bg-primary-foreground dark:bg-secondary-background border border-primary/20 p-5 md:p-6 transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="text-lg font-bold text-primary tracking-tight leading-none">
                  {item.name}
                </h4>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    item.impactLevel === "Critical"
                      ? "bg-rose-100 text-rose-600"
                      : item.impactLevel === "High"
                        ? "bg-orange-100 text-orange-600"
                        : item.impactLevel === "Medium"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {item.impactLevel} Impact
                </span>
              </div>

              {/* Score Indicator */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-primary/80 uppercase tracking-tighter">
                  Impact Score
                </span>
                <div
                  className={`text-xl font-black ${item.impactScore > 7 ? "text-rose-500" : "text-primary/80"}`}
                >
                  {item.impactScore}
                  <span className="text-[10px] text-primary-300 font-normal ml-0.5">
                    /10
                  </span>
                </div>
              </div>
            </div>

            <p className="text-primary/70 text-[14px] leading-relaxed mb-6 max-w-3xl">
              {item.reasoning}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 flex flex-col gap-2">
                <p className="text-[10px] font-bold text-primary/90 uppercase tracking-widest">
                  Resource Usage
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-primary-50 border border-primary-100 p-2.5 rounded-xl text-center">
                    <Database
                      size={14}
                      className="mx-auto mb-1 text-primary/50"
                    />
                    <p className="text-xs font-bold text-primary/80">
                      {item.metrics.estQueries}
                    </p>
                    <p className="text-[9px] text-primary/80 uppercase">
                      Queries
                    </p>
                  </div>
                  <div className="bg-primary-50 border border-primary-100 p-2.5 rounded-xl text-center">
                    <Globe size={14} className="mx-auto mb-1 text-primary/50" />
                    <p className="text-xs font-bold text-primary/80">
                      {item.metrics.estHttpRequests}
                    </p>
                    <p className="text-[9px] text-primary/80 uppercase">
                      Requests
                    </p>
                  </div>
                  <div className="bg-primary-50 border border-primary-100 p-2.5 rounded-xl text-center">
                    <Zap size={14} className="mx-auto mb-1 text-primary/50" />
                    <p className="text-xs font-bold text-primary/80">
                      {item.metrics.estLoadTime}
                    </p>
                    <p className="text-[9px] text-primary/80 uppercase">
                      Impact
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-3 min-h-40">
                {/* Conflict Warning (Only shows if exists) */}
                {item.conflicts && item.conflicts.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-3">
                    <AlertTriangle
                      size={16}
                      className="text-rose-500 shrink-0 mt-0.5"
                    />
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-rose-700 uppercase">
                        Optimization Note
                      </p>
                      {item.conflicts.map((conflict, cIdx) => (
                        <p
                          key={cIdx}
                          className="text-xs text-rose-600 leading-snug"
                        >
                          Consider reviewing compatibility with{" "}
                          <span className="font-bold underline">
                            {conflict.plugin}
                          </span>
                          .
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Helpful Recommendation */}
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                  <Sparkles
                    size={16}
                    className="text-blue-500 shrink-0 mt-0.5"
                  />
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-blue-700 uppercase">
                      Performance Tip
                    </p>
                    <p className="text-xs text-blue-800 leading-relaxed font-medium">
                      {item.recommendation}
                    </p>
                  </div>
                </div>

                {!item.alternates
                  ? []
                  : item.alternates.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm text-primary/80">
                          Alternative plugins with similar features but improved
                          performance (ensure they fit your needs).
                        </p>
                        <ol className="space-y-1 list-disc pl-3.5">
                          {item.alternates.map((x, index) => (
                            <li
                              className="text-xs text-green-600 leading-snug"
                              key={index}
                            >
                              <span className="font-bold underline">
                                {x.name}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
              </div>
            </div>

            {/* Subtle Hover Action indicator */}
          </div>
        ))}
      </div>
    </div>
  );
}
