import { AlertTriangle, Cpu, Info, RefreshCw } from "lucide-react";
import { PluginAnalysis } from "./types";
import { useMemo } from "react";
import { useSiteContext } from "../siteContext";

interface PluginAnalysisProps {
  analysisResult: PluginAnalysis[];
  loading: boolean;
}

export default function AnalysisDashboard({
  analysisResult,
  loading,
}: PluginAnalysisProps) {
  const { selectedSite } = useSiteContext();

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
          <RefreshCw className="animate-spin text-[#141414]" size={48} />
          <Cpu
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40"
            size={20}
          />
        </div>
        <p className="mt-6 font-mono uppercase tracking-[0.3em] text-xs opacity-50 animate-pulse">
          Analyzing Footprint...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-6">
      {!loading && analysisResult.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border border-primary/20 bg-primary-foreground dark:bg-secondary-background">
              <p className="text-[12px] uppercase mb-1">Detected Plugins</p>
              <p className="text-4xl text-primary/80 font-bold">
                {analysisResult.length}
              </p>
            </div>
            <div className="p-6 border border-primary/20 bg-primary-foreground dark:bg-secondary-background">
              <p className="text-[12px] uppercase mb-1">Weight Level</p>
              <p
                className={`text-4xl uppercase font-bold ${impactfulPlugins > 90 ? "text-[#ff6467]" : impactfulPlugins > 40 ? "text-[#FCBF49]" : "text-[#53a94a]"}`}
              >
                {impactfulPlugins}% heavy
              </p>
            </div>
            <div className="p-6 border border-primary/20 bg-primary-foreground dark:bg-secondary-background">
              <p className="text-[12px] uppercase  mb-1">Audit Type</p>
              <p className="text-4xl font-bold text-primary/80 uppercase tracking-tighter">
                FULL SCAN
              </p>
            </div>
          </div>
          <div className="border border-primary/20 bg-primary-foreground dark:bg-secondary-background overflow-hidden">
            <div className="bg-primary/60 dark:bg-primary/20 text-primary-foreground dark:text-primary p-4 flex justify-between items-center">
              <h3 className="font-mono uppercase tracking-widest text-sm">
                Audit Results
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-[12px] font-mono uppercase">
                  Sorted by Impact
                </span>
              </div>
            </div>

            <div className="divide-y divide-[#141414]">
              {analysisResult.map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-mono uppercase border ${
                            item.impactLevel === "Critical"
                              ? "bg-red-600 text-white border-red-600"
                              : item.impactLevel === "High"
                                ? "bg-orange-500 text-white border-orange-500"
                                : item.impactLevel === "Medium"
                                  ? "bg-yellow-400 text-[#141414] border-yellow-400"
                                  : "bg-green-500 text-white border-green-500"
                          }`}
                        >
                          {item.impactLevel} Impact
                        </span>
                        <h4 className="text-xl font-bold uppercase tracking-tight">
                          {item.name}
                        </h4>
                      </div>
                      <div className="text-[15px] text-primary/80 mb-4 leading-relaxed font-sans">
                        <div>{item.reasoning}</div>
                      </div>

                      {/* Performance Metrics Section */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                        <div className="p-3 bg-gray-50 dark:bg-primary/10 border border-[#141414]/5 rounded-sm">
                          <p className="text-[11px] font-mono uppercase mb-1">
                            Est. DB Queries
                          </p>
                          <p className="text-sm font-bold font-mono">
                            {item.metrics.estQueries}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-primary/10 border border-[#141414]/5 rounded-sm">
                          <p className="text-[11px] font-mono uppercase mb-1">
                            Est. HTTP Requests
                          </p>
                          <p className="text-sm font-bold font-mono">
                            {item.metrics.estHttpRequests}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 border dark:bg-primary/10 border-[#141414]/5 rounded-sm">
                          <p className="text-[11px] font-mono uppercase mb-1">
                            Est. Load Impact
                          </p>
                          <p className="text-sm font-bold font-mono">
                            {item.metrics.estLoadTime}
                          </p>
                        </div>
                      </div>

                      {/* Conflict Warnings */}
                      {item.conflicts && item.conflicts.length > 0 && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={14} className="text-red-600" />
                            <p className="text-[12px] font-bold uppercase text-red-900">
                              Potential Conflict Detected
                            </p>
                          </div>
                          <div className="space-y-2">
                            {item.conflicts.map((conflict, cIdx) => (
                              <div
                                key={cIdx}
                                className="text-[12px] text-red-800 leading-relaxed"
                              >
                                <span className="font-bold">
                                  With {conflict.plugin}:
                                </span>{" "}
                                {conflict.issue}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-sm">
                        <Info
                          size={16}
                          className="text-blue-600 mt-0.5 shrink-0"
                        />
                        <div className="text-sm text-blue-800 italic font-sans leading-relaxed">
                          <span className="font-bold uppercase tracking-tighter mr-2 not-italic text-blue-900">
                            Recommendation:
                          </span>
                          {item.recommendation}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 ">
                      <div className="text-center bg-white dark:bg-primary/20 p-4 border border-[#141414] min-w-25 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] transition-all">
                        <p className="text-[9px] font-mono uppercase mb-1">
                          Impact Score
                        </p>
                        <p className="text-4xl font-bold leading-none">
                          {item.impactScore}
                          <span className="text-xs font-normal">/10</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
