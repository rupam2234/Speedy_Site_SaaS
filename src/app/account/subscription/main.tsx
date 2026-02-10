"use client";

import { UserPlan } from "@/app/api/subscriptions/plan/route";
import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import { BadgeCheck, CheckCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CustomTooltip, LoadingAnimation } from "@/components/theme";
import ActivePlanCard from "./activePlan";

export type PlanType = "Basic" | "Pro" | "Agency" | "Free";

interface PlanCardProps {
  name: PlanType;
  price: number;
  description: string;
  features: string[];
  current: boolean;
}

export default function Main() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [planData, setPlanData] = useState<UserPlan | null>(null);
  const user = useSupabaseUser();
  const currentUser = useRef<string | null>(null);

  useEffect(() => {
    if (user?.id && user.id !== currentUser.current) {
      currentUser.current = user.id;
      getUserSubscription();
    }
  }, [user]);

  async function getUserSubscription() {
    if (user) {
      try {
        const res = await fetch("/api/subscriptions/plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: user?.id }),
        });

        if (res.ok) {
          const data: any = await res.json();
          setPlanData(data.data[0]);
        }
      } catch (error) {
        console.error("Error fetching user plan", error);
      }
    }
  }

  const usage = {
    siteSlotsUsed: planData?.active_sites,
    siteSlotsTotal: "∞",
    nextBillingDate: planData?.period_ends_at,
    lastInvoiceDate: planData?.period_starts_at,
    computed_usage_limit: planData?.computed_usage_limit,
    current_usage: planData?.current_usage,
  };

  const planCards: PlanCardProps[] = [
    {
      name: "Basic",
      price: 19,
      description: "Core features for individuals",
      current: planData?.plan === "Basic",
      features: [
        "Unlimited sites",
        "Real-Time Performance Tracking",
        "50,000 pageviews/month",
        "1 year data retention",
        "Analytics Dashboard",
        "Element Debugging",
        "Email & Slack Alerts",
      ],
    },
    {
      name: "Pro",
      price: 49,
      description: "Advanced monitoring for growing teams",
      current: planData?.plan === "Pro",
      features: [
        "Unlimited sites",
        "Real-Time Performance Tracking",
        "150,000 pageviews/month",
        "1 year data retention",
        "Analytics Dashboard",
        "Element Debugging",
        "WP Optimization Assistance",
        "Performance comparison",
        "Email & Slack Alerts",
      ],
    },
    {
      name: "Agency",
      price: 149,
      description: "Premium insights for high-traffic clients and agencies",
      current: planData?.plan === "Agency",
      features: [
        "Unlimited sites",
        "Real-Time Performance Tracking",
        "5,00,000 pageviews",
        "1 year data retention",
        "Analytics Dashboard",
        "Element Debugging",
        "WP Optimization Assistance",
        "Image optimization on Fly",
        "Email & Slack Alerts",
        "Priority Support",
      ],
    },
  ];

  const calculatePrice = (monthlyPrice: number) => {
    if (billingCycle === "monthly") return `$${monthlyPrice}/month`;
    const yearlyPrice = monthlyPrice * 12 * 0.9; // 10% discount
    return `$${yearlyPrice.toFixed(0)}/year`;
  };

  if (!planData) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="py-2 px-5 bg-primary/5 dark:bg-secondary-background text-primary font-medium rounded">
            <h3 className="text-[16px] text-primary/80">
              Manage your subscription
            </h3>
          </div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={
                  billingCycle === "monthly"
                    ? "font-medium text-primary/70"
                    : "text-primary/70 font-medium"
                }
              >
                Monthly
              </span>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className={`sr-only`}
                  checked={billingCycle === "yearly"}
                  onChange={() =>
                    setBillingCycle((prev) =>
                      prev === "monthly" ? "yearly" : "monthly",
                    )
                  }
                />
                <span
                  className={`relative inline-block w-10 h-5 rounded-full transition ${
                    billingCycle === "yearly" ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition transform ${
                      billingCycle === "yearly" ? "translate-x-5" : ""
                    }`}
                  />
                </span>
              </label>
              <span
                className={
                  billingCycle === "yearly"
                    ? "font-medium text-primary/80"
                    : "font-medium text-primary/80"
                }
              >
                Yearly{" "}
                <span className="ml-1 text-green-600 font-semibold">
                  (Save 10%)
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planCards.map((plan) => (
              <PlanCard
                key={plan.name}
                name={plan.name}
                price={plan.price}
                description={plan.description}
                features={plan.features}
                current={plan.current}
                highlight={plan.name === planData.plan}
                displayPrice={calculatePrice(plan.price)}
                billingCycle={billingCycle}
              />
            ))}
          </div>
        </div>

        <ActivePlanCard userPlan={planData.plan} usage={usage} />
      </div>
    </div>
  );
}

function PlanCard({
  name,
  description,
  features,
  current,
  highlight = false,
  displayPrice,
  billingCycle,
}: {
  name:
    | "Free"
    | "Basic"
    | "Pro"
    | "Agency"
    | "Basic (Yearly)"
    | "Pro (Yearly)"
    | "Agency (Yearly)";
  price: number;
  description: string;
  features: string[];
  current: boolean;
  highlight?: boolean;
  displayPrice: string;
  billingCycle: "monthly" | "yearly";
}) {
  // stripe price ids
  const priceMap = {
    Basic: "price_1SHfk8FudyIXBfXkozoK2jmm",
    Pro: "price_1SHfnpFudyIXBfXkLekhIkoM",
    Agency: "price_1SHfpXFudyIXBfXkVPU9bgrP",
    Basic_yearly: "price_1SV7F9FudyIXBfXk8dez9wT1",
    Pro_yearly: "price_1SV7N3FudyIXBfXkngR9eZRh",
    Agency_yearly: "price_1SV7OMFudyIXBfXkEeO7i2TS",
  };

  async function handleSubscribe(priceId: string) {
    try {
      const res = await fetch("/api/subscriptions/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data: any = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        console.error("Error creating checkout session:", data.error);
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Unexpected error occurred");
    }
  }

  return (
    <div
      className={`p-6 border rounded flex flex-col justify-between transition ${
        highlight
          ? "bg-blue-50 dark:bg-secondary-background border-blue-300"
          : "bg-white dark:bg-secondary-background border-primary/15"
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <h3 className="text-lg font-semibold text-primary/80">{name}</h3>
            {name === "Pro" ? (
              <div className="px-2 text-[10px] py-1 text-primary-foreground dark:text-primary font-semibold bg-green-500/60">
                Most Popular
              </div>
            ) : (
              <></>
            )}
          </div>
          {highlight && (
            <BadgeCheck
              className="w-4 h-4 text-blue-600 shrink-0"
              aria-label="Recommended Plan"
              role="img"
            />
          )}
        </div>

        <div className="h-14">
          <p className="text-sm text-primary/60 mt-1">{description}</p>
        </div>

        <div className="-mx-6 bg-accent/80 dark:bg-accent-foreground/20 w-[calc(100%+3rem)] px-6 py-4">
          <p className="text-2xl font-bold text-blue-500/70 dark:text-amber-200">
            {displayPrice}
          </p>
        </div>

        <ul className="mt-4 space-y-2">
          {features.map((feature) => {
            const match = feature.match(/(\d[\d,]*)/); // find the number part
            const numberPart = match?.[0];
            const shouldUnderline =
              feature.toLowerCase().includes("pageviews") && numberPart;

            const [before, after] = numberPart
              ? feature.split(numberPart)
              : [feature, ""];

            return (
              <li
                key={feature}
                className="flex items-start text-sm text-primary/60 relative group"
              >
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 shrink-0" />
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

      <button
        disabled={current}
        onClick={() => {
          const priceId =
            billingCycle === "monthly"
              ? priceMap[name as keyof typeof priceMap]
              : priceMap[`${name}_yearly` as keyof typeof priceMap];

          if (!current) handleSubscribe(priceId);
        }}
        className={`mt-6 w-full text-sm font-medium py-2 rounded-md transition-all duration-150 ${
          current
            ? "bg-blue-500/30 text-primary cursor-not-allowed"
            : highlight
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-800 hover:bg-blue-500/30 hover:text-primary"
        }`}
      >
        {current ? "✓ Current Plan" : `Change to ${name}`}
      </button>
    </div>
  );
}
