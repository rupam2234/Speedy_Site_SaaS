"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useSiteContext } from "../siteContext";

/* -------------------------------------------------------------------------- */
/* Service catalog                                                            */
/* -------------------------------------------------------------------------- */

type Benefit = {
  title: string;
  detail: string;
};

type ConfigStep = {
  title: string;
  detail: string;
  /** Optional in-dashboard path for a "go here" link. */
  link?: { href: string; label: string };
};

type ServiceOption = {
  /** Must match a key in PRICE_MAP (src/app/api/checkout/route.ts). */
  priceKey: string;
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  /** Dashboard areas this service switches on. */
  unlocks: string[];
  benefits: Benefit[];
  /** Setup path, shown as an ordered list inside the panel. */
  setup: ConfigStep[];
};

/**
 * What this page sells.
 *
 * Today there is one purchasable service (`managed_wp` is the only key in
 * PRICE_MAP). Adding a second product is two edits: a PRICE_MAP entry in
 * src/app/api/checkout/route.ts and one object here. The page renders one
 * panel per entry, so no selector has to be kept in sync.
 */
const UPGRADE_SERVICES: ServiceOption[] = [
  {
    priceKey: "managed_wp",
    name: "Managed WordPress Performance",
    tagline:
      "We find and fix what slows your WordPress site, using evidence from your real visitors.",
    price: "$299",
    priceNote: "one-time per site, covers 12 months.",
    unlocks: [
      "RUM analytics (Core Web Vitals, trace, UX)",
      "Pages, fonts and LCP image analysis",
      "WordPress plugin analysis",
      "Expert issue queue",
    ],
    benefits: [
      {
        title: "Real-user Core Web Vitals",
        detail:
          "Actual visitor data, not 28-day averages — you see what your users really experience.",
      },
      {
        title: "Per-page, per-device, per-browser breakdown",
        detail:
          "Know exactly where users struggle instead of guessing from a single lab score.",
      },
      {
        title: "Collector connects with your site",
        detail:
          "One plugin, zero snippets. No copy-paste, no script maintenance, no manual setup.",
      },
      {
        title: "Issues arrive pre-diagnosed",
        detail:
          "Every issue comes with a baked reason: which asset, which page, what caused it, and the fix we suggest.",
      },
      {
        title: "We do the fixing",
        detail:
          "You monitor; our experts optimize. You follow every change with its measured impact.",
      },
      {
        title: "Core Web Vitals Pass Guarantee",
        detail:
          "If a core vital still fails, we keep optimizing until it passes.",
      },
    ],
    setup: [
      {
        title: "Complete the one-time payment",
        detail:
          "$299 covers 12 months for one site. There is no subscription and no automatic renewal.",
      },
      {
        title: "Confirm your site details",
        detail:
          "On the page Stripe returns you to, confirm the domain the service should cover. We provision a 1-year entitlement against it.",
      },
      {
        title: "Connect your site",
        detail:
          "Download the plugin already tied to your domain — no keys to paste and no snippet to insert.",
        link: {
          href: "/dashboard/wordpress-plugin-analysis",
          label: "WordPress plugin analysis",
        },
      },
      {
        title: "Verification runs for you",
        detail:
          "Ownership, environment and plugin compatibility are checked automatically; the collector is switched on when they pass.",
        link: {
          href: "/dashboard/managed-wp/status",
          label: "Managed WP status",
        },
      },
      {
        title: "First data lands in minutes",
        detail:
          "Beacons populate the RUM dashboard while you carry on, and diagnosed issues open in the expert queue.",
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function Pricing() {
  const { plan, planExpiresAt } = useSiteContext();

  // plan is resolved by the dashboard layout (validatePlan). Waiting here
  // avoids flashing "Free" at users who are already paid.
  if (plan === null) return null;

  return <PricingBody plan={plan} planExpiresAt={planExpiresAt} />;
}

function PricingBody({
  plan,
  planExpiresAt,
}: {
  plan: string;
  planExpiresAt: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPaid = plan === "Managed WP";
  const expiresAt = planExpiresAt;

  const handleSubscribe = async (priceKey: string) => {
    if (!priceKey) {
      console.error("Missing price key");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey }),
      });
      const data: any = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Could not start checkout. Try again shortly.");
    } catch {
      setError("Could not start checkout. Try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {/* <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Services & Upgrade
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-primary/70">
            One-time payment. No subscription. No auto-renewal.
          </p>
        </div> */}
        <CurrentPlanBadge plan={plan} />
      </div>

      {/* Service panels — one per UPGRADE_SERVICES entry */}
      <div className="space-y-6">
        {UPGRADE_SERVICES.map((service) => (
          <ServicePanel
            key={service.priceKey}
            service={service}
            isPaid={isPaid}
            loading={loading}
            error={error}
            onSubscribe={handleSubscribe}
            expiresAt={expiresAt}
          />
        ))}
      </div>
    </div>
  );
}

function ServicePanel({
  service,
  isPaid,
  loading,
  error,
  onSubscribe,
  expiresAt,
}: {
  service: ServiceOption;
  isPaid: boolean;
  loading: boolean;
  error: string;
  onSubscribe: (priceKey: string) => void;
  expiresAt: string | null;
}) {
  return (
    <article className="rounded-sm border border-[#141414]/10 bg-white p-6 dark:border-white/10 dark:bg-secondary-background">
      {/* Header: name + price inline */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">{service.name}</h2>
          <p className="mt-0.5 text-sm text-primary/70">{service.tagline}</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="text-xl font-bold tabular-nums text-primary">
            {service.price}
          </div>
          <div className="text-xs text-primary/50">{service.priceNote}</div>
        </div>
      </header>

      {/* Unlocks — single muted line */}
      <p className="text-xs text-primary/50 mb-6">
        Switches on: {service.unlocks.join(", ")}
      </p>

      {/* Two-column layout: Benefits | Setup */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Benefits */}
        <section aria-labelledby="benefits-heading">
          <h3
            id="benefits-heading"
            className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary/50"
          >
            <Check
              size={12}
              aria-hidden="true"
              className="text-emerald-500/60"
            />
            Benefits
          </h3>
          <ul className="space-y-3">
            {service.benefits.map((b) => (
              <li key={b.title} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Check size={12} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-primary">{b.title}</p>
                  <p className="text-xs leading-relaxed text-primary/60">
                    {b.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Setup steps */}
        <section aria-labelledby="config-heading">
          <h3
            id="config-heading"
            className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary/50"
          >
            <ArrowRight size={12} aria-hidden="true" />
            How to configure it
          </h3>
          <ol className="space-y-4">
            {service.setup.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#141414]/10 bg-white text-[11px] font-medium text-primary dark:border-white/10 dark:bg-secondary-background">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-primary">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-primary/60">
                    {step.detail}
                  </p>
                  {step.link && (
                    <a
                      href={step.link.href}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary underline decoration-primary/30 underline-offset-2 transition hover:decoration-primary"
                    >
                      {step.link.label}
                      <ArrowRight size={12} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Action */}
      <div className="mt-6 border-t border-[#141414]/10 pt-6 dark:border-white/10">
        {isPaid ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Check size={16} aria-hidden="true" />
              {expiresAt ? (
                <>
                  Valid till:{" "}
                  <span className="font-mono tabular-nums">
                    {new Date(expiresAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </>
              ) : (
                "Active on your account"
              )}
            </p>
            <a
              href="/dashboard/managed-wp/status"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              View service status
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-primary/70">
              One payment, one year, no auto-renewal.
            </p>
            <button
              type="button"
              onClick={() => onSubscribe(service.priceKey)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Starting checkout..." : `Upgrade — ${service.price}`}
              {!loading && <ArrowRight size={14} aria-hidden="true" />}
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      </div>
    </article>
  );
}

function CurrentPlanBadge({ plan }: { plan: string }) {
  const paid = plan === "Managed WP";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-medium
        ${
          paid
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-primary/10 text-primary/60"
        }
      `}
    >
      {paid ? <Check size={12} aria-hidden="true" /> : <span className="w-3" />}
      <span>Current: {paid ? "Managed WP" : "Free"}</span>
    </span>
  );
}
