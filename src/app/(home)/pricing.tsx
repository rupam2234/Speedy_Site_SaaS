"use client";

import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Crown,
  Database,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { CustomTooltip } from "@/components/theme";

type PricingCardProps = {
  name: string;
  price: number;
  description: string;
  features: string[];
  current: boolean;
  highlight?: boolean;
  defaultPrice: number;
  displayPrice: number;
  index?: number;
};

async function handleSubscribe({
  priceKey,
  mode,
}: {
  priceKey: string;
  mode: "payment" | "subscription";
}) {
  if (!priceKey) {
    console.error("Missing price id");
    return;
  }
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceKey, mode }),
    });
    const data: any = await res.json();
    if (data.url) window.location.href = data.url;
  } catch (err) {
    console.error(err);
  }
}

// Groups plan features into labeled sections so the card reads in scannable blocks
const FEATURE_CATEGORIES = {
  core: { label: "Core Service", color: "text-amber-500" },
  monitoring: {
    label: "Monitoring & Data",
    color: "text-blue-500",
  },
  optimization: { label: "Optimization", color: "text-emerald-500" },
  support: { label: "Support", color: "text-violet-500" },
} as const;

type CategoryKey = keyof typeof FEATURE_CATEGORIES;

function categorizeFeature(feature: string): CategoryKey {
  const f = feature.toLowerCase();
  if (
    f.includes("site") ||
    f.includes("wp rocket") ||
    f.includes("dedicated") ||
    f.includes("service")
  )
    return "core";
  if (
    f.includes("monitoring") ||
    f.includes("pageview") ||
    f.includes("data retention") ||
    f.includes("history") ||
    f.includes("realtime") ||
    f.includes("tracking")
  )
    return "monitoring";
  if (
    f.includes("plugin") ||
    f.includes("image") ||
    f.includes("font") ||
    f.includes("ai analysis") ||
    f.includes("audit") ||
    f.includes("debugging")
  )
    return "optimization";
  return "support";
}

export function PricingCardContent({
  props,
  needCtaButtons = false,
}: {
  props: PricingCardProps;
  needCtaButtons?: boolean;
}) {
  const categorizedFeatures = props.features.reduce(
    (acc, feature) => {
      const cat = categorizeFeature(feature);
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(feature);
      return acc;
    },
    {} as Record<CategoryKey, string[]>,
  );

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10">
      {/* Top accent bar */}
      <div className="h-1.5 bg-linear-to-r from-blue-400 via-purple-500 to-blue-400" />

      <div className="flex flex-col h-full p-7">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
              <Crown className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Managed Service
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
            {props.name}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {props.description}
          </p>
        </div>

        {/* Price */}
        <div className="mb-6 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              ${props.displayPrice.toFixed(0)}
            </span>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              one-time
            </span>
          </div>
          {/* <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <Zap className="w-3 h-3" aria-hidden="true" />
              Not a subscription
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[11px] font-medium text-blue-700 dark:text-blue-400">
              <Database className="w-3 h-3" aria-hidden="true" />
              12 months included
            </span>
          </div> */}
        </div>

        {/* Features grouped by category */}
        <div className="flex-1 space-y-5">
          {(Object.keys(FEATURE_CATEGORIES) as CategoryKey[]).map((key) => {
            const category = FEATURE_CATEGORIES[key];
            const features = categorizedFeatures[key] || [];
            if (features.length === 0) return null;
            return (
              <div key={key}>
                <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {" "}
                  {category.label}
                </div>
                <ul className="space-y-2">
                  {features.map((feature) => {
                    const match = feature.match(/(\d[\d,]*)/);
                    const numberPart = match?.[0];
                    const shouldUnderline =
                      feature.toLowerCase().includes("pageviews") && numberPart;
                    const [before, after] = numberPart
                      ? feature.split(numberPart)
                      : [feature, ""];

                    return (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 leading-snug"
                      >
                        <CheckCircle
                          className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>
                          {before}
                          {shouldUnderline ? (
                            <CustomTooltip
                              trigger={
                                <span className="underline decoration-dotted decoration-primary/40">
                                  {numberPart}
                                </span>
                              }
                              side="bottom"
                              content="Tracking throttles on exceed"
                            />
                          ) : (
                            numberPart
                          )}
                          {after}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Trust signals */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              <Shield
                className="w-3.5 h-3.5 text-emerald-500"
                aria-hidden="true"
              />
              No auto-renewal
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              <Users className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
              Dedicated support
            </span>
          </div>
        </div>

        {/* CTA */}
        {needCtaButtons && (
          <button
            disabled={props.current}
            onClick={() =>
              handleSubscribe({ priceKey: "managed_wp", mode: "payment" })
            }
            className={`mt-6 w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
              props.current
                ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                : "bg-linear-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/25 hover:shadow-xl active:scale-[0.98]"
            }`}
          >
            {props.current ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
                Current Plan
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Get Managed WP Performance Service
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
