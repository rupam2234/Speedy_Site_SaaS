"use client";

import {
  ArrowRightLeft,
  Camera,
  ChevronDown,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ComparisonData, UxGranularData } from ".";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useSiteContext } from "../../siteContext";

interface Props {
  compBIndex: number;
  compAIndex: number;
  setCompBIndex: (value: number) => void;
  setCompAIndex: (value: number) => void;
  userHappinessData: UxGranularData[];
  alphacode2toCountry: Record<string, string>;
  comparisonData: ComparisonData | null;
}

export function ComparisonMain({
  compBIndex,
  compAIndex,
  setCompBIndex,
  setCompAIndex,
  userHappinessData,
  alphacode2toCountry,
  comparisonData,
}: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { selectedSite } = useSiteContext();
  const [error, setError] = useState<string>("");

  const captureLimit = 3; // maximum allowed captures per session
  const captureCountRef = useRef(0);

  const sortedData = useMemo(() => {
    return [...userHappinessData].sort((a, b) =>
      b.country.localeCompare(a.country),
    );
  }, [userHappinessData]);

  const handleCapture = useCallback(async () => {
    if (reportRef.current === null) return;

    // Check if user has reached the limit
    if (captureCountRef.current >= captureLimit) {
      setError(
        `You've already generated ${captureLimit} reports. Take a breather before making more.`,
      );
      return;
    }

    setIsCapturing(true);

    try {
      // small delay to ensure UI settles
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        filter: (node: HTMLElement) =>
          !["no-capture"].some((cls) => node.classList?.contains?.(cls)),
        backgroundColor: "#ffffff",
        style: {
          color: "#0f172a",
          backgroundColor: "#ffffff",
          padding: "20px",
          borderRadius: "12px",
        },
      });

      const link = document.createElement("a");
      link.download = `ux-report-${selectedSite}.png`;
      link.href = dataUrl;
      link.click();

      // Increment the capture count
      captureCountRef.current += 1;
    } catch (err) {
      console.error("Capture failed", err);
    } finally {
      setIsCapturing(false);
    }
  }, [reportRef, selectedSite]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setError("");
    }, 10000);

    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div
      ref={reportRef}
      className="border border-primary/20 rounded-xl bg-primary/2 p-6 space-y-6"
    >
      <div className="flex items-center justify-between no-capture">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="text-primary" size={20} />
          <h3 className="font-bold text-lg">Segment Comparison</h3>
        </div>

        <div className="flex items-center gap-2">
          {error.length > 0 && (
            <p className="text-red-400 text-[12px] font-medium">{error}</p>
          )}
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className="flex items-cente cursor-pointer gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-bold transition-all hover:bg-primary/20 disabled:opacity-50"
          >
            {isCapturing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Capturing...
              </>
            ) : (
              <>
                <Camera size={14} />
                Capture Report
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <SegmentSelect
          label="Segment A"
          value={compBIndex}
          onChange={setCompBIndex}
          data={sortedData}
          alphacode2toCountry={alphacode2toCountry}
          userHappinessData={userHappinessData}
        />

        <div className="flex justify-center pt-4 md:pt-6">
          <div className="p-2 rounded-full bg-primary/10 text-primary/30 hover:text-primary/80 cursor-pointer border border-primary/20">
            <ArrowRightLeft size={16} onClick={handleSwap} />
          </div>
        </div>

        <SegmentSelect
          label="Segment B"
          value={compAIndex}
          onChange={setCompAIndex}
          data={sortedData}
          alphacode2toCountry={alphacode2toCountry}
          userHappinessData={userHappinessData}
        />
      </div>

      {comparisonData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-4">
          <ComparisonCard
            label="LCP (Load Speed)"
            diff={comparisonData.lcpDiff}
            unit="ms"
            valA={comparisonData.segA.p75_lcp}
            valB={comparisonData.segB.p75_lcp}
          />
          <ComparisonCard
            label="INP (Responsiveness)"
            diff={comparisonData.inpDiff}
            unit="ms"
            valA={comparisonData.segA.p75_inp}
            valB={comparisonData.segB.p75_inp}
          />
          <ComparisonCard
            label="TTFB (Server Wait)"
            diff={comparisonData.ttfbDiff}
            unit="ms"
            valA={comparisonData.segA.p75_ttfb}
            valB={comparisonData.segB.p75_ttfb}
          />
          <ComparisonCard
            label="CLS (Stability)"
            diff={comparisonData.clsDiff}
            unit=""
            valA={comparisonData.segA.p75_cls}
            valB={comparisonData.segB.p75_cls}
            isDecimal={true}
          />
        </div>
      )}
    </div>
  );

  function handleSwap() {
    setCompAIndex(compBIndex);
    setCompBIndex(compAIndex);
  }
}

function SegmentSelect({
  label,
  value,
  onChange,
  data,
  alphacode2toCountry,
  userHappinessData,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  data: UxGranularData[];
  alphacode2toCountry: Record<string, string>;
  userHappinessData: UxGranularData[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full appearance-none bg-background border border-primary/20 rounded-md p-2 pr-10 text-xs font-medium cursor-pointer transition-all hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          {data.map((d) => {
            const originalIndex = userHappinessData.findIndex(
              (x) =>
                x.country === d.country &&
                x.device_type === d.device_type &&
                x.network === d.network,
            );

            return (
              <option key={originalIndex} value={originalIndex}>
                {alphacode2toCountry[d.country] || d.country} — {d.device_type}{" "}
                ({d.network === null ? "WiFi" : d.network})
              </option>
            );
          })}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground opacity-70"
        />
      </div>
    </div>
  );
}

export function ComparisonCard({
  label,
  diff,
  unit,
  valA,
  valB,
  isDecimal = false,
}: {
  label: string;
  diff: number;
  unit: string;
  valA: number;
  valB: number;
  isDecimal?: boolean;
}) {
  const isNoChange = valA === valB;
  const isImprovement = valB < valA;

  const absDiff = Math.abs(diff);
  const displayDiff = isDecimal ? absDiff.toFixed(2) : Math.round(absDiff);
  const formatVal = (v: number) => (isDecimal ? v?.toFixed(3) : Math.round(v));

  const getSemanticLabel = () => {
    if (isNoChange) return "No Change";
    if (label.includes("CLS")) return isImprovement ? "Better" : "Worse";
    return isImprovement ? "Faster" : "Slower";
  };

  return (
    <div className="bg-background/40 border border-primary/10 rounded-lg p-4 flex flex-col transition-all hover:border-primary/30">
      <span className="text-[10px] font-bold uppercase text-muted-foreground mb-3 tracking-widest">
        {label}
      </span>

      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div
            className={`flex items-center gap-1.5 text-2xl font-black ${
              isNoChange
                ? "text-muted-foreground"
                : isImprovement
                  ? "text-green-500"
                  : "text-red-500"
            }`}
          >
            {!isNoChange &&
              (valB < valA ? (
                <TrendingDown size={24} />
              ) : (
                <TrendingUp size={24} />
              ))}
            {isNoChange ? "0%" : `${displayDiff}%`}
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
              isNoChange
                ? "bg-muted"
                : isImprovement
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-600"
            }`}
          >
            {getSemanticLabel()}
          </span>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-muted-foreground font-medium mb-1">
            A → B
          </div>
          <div className="text-[11px] font-bold flex flex-col items-end">
            <span className="text-muted-foreground/60 line-through decoration-1">
              {formatVal(valA)}
              {unit}
            </span>
            <span className="text-foreground text-sm">
              {formatVal(valB)}
              {unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
