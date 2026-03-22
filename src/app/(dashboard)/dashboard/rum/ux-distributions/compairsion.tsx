import {
  ArrowRightLeft,
  ChevronDown,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ComparisonData, UxGranularData } from ".";

interface Props {
  compBIndex: number;
  compAIndex: number;
  setCompBIndex: (value: number) => void;
  setCompAIndex: (value: number) => void;
  userHappinessData: UxGranularData[];
  alphacode2toCountry: Record<string, string>;
  comparisonData: ComparisonData;
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
  return (
    <div className="border border-primary/20 rounded-xl bg-primary/2 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ArrowRightLeft className="text-primary" size={20} />
        <h3 className="font-bold text-lg">Segment Comparison</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* SEGMENT B */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
            Segment B
          </label>
          <div className="relative">
            <select
              value={compBIndex}
              onChange={(e) => setCompBIndex(Number(e.target.value))}
              className="w-full appearance-none bg-background border border-primary/20 rounded-md p-2 pr-10 text-xs font-medium cursor-pointer transition-all hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {userHappinessData.map((d, i) => (
                <option key={i} value={i}>
                  {alphacode2toCountry[d.country] || d.country} —{" "}
                  {d.device_type} ({d.network})
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground opacity-70"
            />
          </div>
        </div>

        {/* ICON SEPARATOR */}
        <div className="flex justify-center pt-4 md:pt-6">
          <div className="p-2 rounded-full bg-primary/10 text-primary border border-primary/20">
            <ArrowRightLeft size={16} />
          </div>
        </div>

        {/* SEGMENT A */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
            Segment A
          </label>
          <div className="relative">
            <select
              value={compAIndex}
              onChange={(e) => setCompAIndex(Number(e.target.value))}
              className="w-full appearance-none bg-background border border-primary/20 rounded-md p-2 pr-10 text-xs font-medium cursor-pointer transition-all hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {userHappinessData.map((d, i) => (
                <option key={i} value={i}>
                  {alphacode2toCountry[d.country] || d.country} —{" "}
                  {d.device_type} ({d.network})
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground opacity-70"
            />
          </div>
        </div>
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
  const isImprovement = diff <= 0;
  const absDiff = Math.abs(Math.round(diff));

  const formatVal = (v: number) => (isDecimal ? v?.toFixed(3) : Math.round(v));

  return (
    <div className="bg-background/40 border border-primary/10 rounded-lg p-4 flex flex-col transition-all hover:border-primary/30">
      <span className="text-[10px] font-bold uppercase text-muted-foreground mb-3 tracking-widest">
        {label}
      </span>

      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div
            className={`flex items-center gap-1.5 text-2xl font-black ${
              isImprovement ? "text-green-500" : "text-red-500"
            }`}
          >
            {isImprovement ? (
              <TrendingDown size={24} className="shrink-0" />
            ) : (
              <TrendingUp size={24} className="shrink-0" />
            )}
            {absDiff}%
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
              isImprovement
                ? "bg-green-500/10 text-green-600"
                : "bg-red-500/10 text-red-600"
            }`}
          >
            {isImprovement ? "Faster" : "Slower"}
          </span>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-muted-foreground font-medium mb-1">
            Comparing P75s
          </div>
          <div className="text-[11px] font-bold flex flex-col items-end">
            <span className="text-muted-foreground/60 line-through decoration-1">
              {formatVal(valA)}
              {unit}
            </span>
            <span className="text-foreground">
              {formatVal(valB)}
              {unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
