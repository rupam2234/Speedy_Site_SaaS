"use client";

import { UserPlan } from "@/app/api/subscriptions/plan/route";
import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import { X, LayoutPanelTop } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LoadingAnimation } from "@/components/theme";
import ActivePlanCard from "./activePlan";
import { PlanCardProps } from ".";
import { PricingCardContent } from "@/app/(home)";

export const planCards: PlanCardProps[] = [
  {
    name: "Starter",
    price: 9,
    description:
      "User experience & performance monitoring + optimization assistance",
    features: [
      "1 site",
      "Real-Time Performance Tracking",
      "20,000 pageviews/month",
      "History + Realtime data",
      "1 year data retention",
      "AI analysis & suggestions",
      "5 WP Plugin Audits",
      "Image & Font Flagging",
      "Weekly Email Report",
      "Standard Support",
    ],
  },
  {
    name: "Basic",
    price: 19,
    description:
      "User experience & performance monitoring + optimization assistance",
    features: [
      "Up to 3 sites",
      "Real-Time Performance Tracking",
      "50,000 pageviews/month",
      "History + Realtime data",
      "1 year data retention",
      "AI analysis & suggestions",
      "WP Plugin Monitoring + Audits",
      "Image & Font Analysis",
      "Weekly Email Report",
      "Standard Support",
    ],
  },
  {
    name: "Managed WordPress Performance",
    price: 299,
    description:
      "Quick performance upgrade + weekly reports until 12 months combined with web vitals & user experience monitoring.",
    features: [
      "1 Site & WP Rocket Premium Plugin",
      "Dedicated WordPress Optimization Service (pass web vitals and maintain performance)",
      "Real-Time Performance Tracking",
      "Unlimited pageviews/month for 1 year",
      "History + Realtime data",
      "1 year data retention",
      "AI analysis and debugging",
      "WP Plugin Monitoring + Audits",
      "Image & font analysis",
      "Weekly report and dedicated support",
    ],
  },

  // {
  //   name: "Pro",
  //   price: 49,
  //   description: "Advanced monitoring for growing teams",
  //   current: planData?.plan === "Pro",
  //   features: [
  //     "Up to 6 sites",
  //     "Real-Time Performance Tracking",
  //     "200,000 pageviews/month",
  //     "History + Realtime data",
  //     "1 year data retention",
  //     "Element Debugging",
  //     "WP Plugin Monitoring + Audits",
  //     "Image & Font Flagging",
  //     "Weekly Email Report",
  //     "Priority Support",
  //   ],
  // },
  // {
  //   name: "Agency",
  //   price: 149,
  //   description: "Premium insights for high-traffic clients and agencies",
  //   current: planData?.plan === "Agency",
  //   features: [
  //     "Up to 20 sites",
  //     "Real-Time Performance Tracking",
  //     "800,000 pageviews/month",
  //     "History + Realtime data",
  //     "1 year data retention",
  //     "Element Debugging",
  //     "WP Plugin Monitoring + Audits",
  //     "Image & Font Flagging",
  //     "Weekly Email Report",
  //     "Priority Support",
  //   ],
  // },
];

export default function SubscriptionManager() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [planData, setPlanData] = useState<UserPlan | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
          headers: { "Content-Type": "application/json" },
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

  const allPlans = [
    ...planCards,
    ...planCards.map((x) => ({
      ...x,
      current: planData?.plan === X.name,
    })),
  ];

  const calculatePrice = (monthlyPrice: number): number => {
    if (billingCycle === "monthly") return monthlyPrice;
    return (monthlyPrice * 12 * 0.9) / 12; // 10% discount
  };

  if (!allPlans) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="p-5 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="py-2 px-5 bg-primary/5 dark:bg-secondary-background text-primary font-medium rounded">
          <h3 className="text-[16px] text-primary/80">Manage your plan</h3>
        </div>

        <div className="flex items-center gap-6">
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
                className="sr-only"
                checked={billingCycle === "yearly"}
                onChange={() =>
                  setBillingCycle((p) =>
                    p === "monthly" ? "yearly" : "monthly",
                  )
                }
              />
              <span
                className={`relative inline-block w-10 h-5 rounded-full transition ${billingCycle === "yearly" ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition transform ${billingCycle === "yearly" ? "translate-x-5" : ""}`}
                />
              </span>
            </label>
            <span className="font-medium text-primary/80">
              Yearly{" "}
              <span className="ml-1 text-green-600 font-semibold">
                (Save 10%)
              </span>
            </span>
          </div>

          {/* Usage Slider Trigger */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary/80 rounded-md text-sm font-semibold transition"
          >
            <LayoutPanelTop className="w-4 h-4" />
            View Usage & Plan
          </button>
        </div>
      </div>

      {/* 4 PLANS IN ONE LINE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {planCards.map((plan) => (
          <PricingCardContent
            needCtaButtons={true}
            key={plan.name}
            props={{
              name: plan.name,
              price: plan.price,
              description: plan.description,
              features: plan.features,
              current: plan.current ? plan.current : false,
              highlight: plan.name === planData?.plan,
              defaultPrice: plan.price,
              displayPrice: calculatePrice(plan.price),
              billingCycle: billingCycle,
            }}
          />
        ))}
      </div>

      {/* FOLDABLE SIDEBAR (DRAWER) */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-[#121212] z-50 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-primary/10 ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Active Subscription</h3>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 hover:bg-primary/5 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <ActivePlanCard userPlan={planData?.plan} usage={usage} />
        </div>
      </div>

      {/* BACKDROP */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
    </div>
  );
}
