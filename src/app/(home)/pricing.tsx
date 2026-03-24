"use client";

import { CheckCircle } from "lucide-react";
import { useState } from "react";
import { CustomTooltip } from "@/components/theme";
import { PlanType } from "../account/subscription";

interface PlanCardProps {
  name: PlanType;
  price: number;
  description: string;
  features: string[];
}

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  const planCards: PlanCardProps[] = [
    {
      name: "Starter",
      price: 9,
      description: "Core features with limited use",
      features: [
        "1 site",
        "Real-Time Performance Tracking",
        "20,000 pageviews/month",
        "History + Realtime data",
        "1 year data retention",
        "Element Debugging",
        "5 WP Plugin Audits",
        "Image & Font Flagging",
        "Weekly Email Report",
        "Standard Support",
      ],
    },
    {
      name: "Basic",
      price: 19,
      description: "Core features for individuals",
      features: [
        "Up to 2 sites",
        "Real-Time Performance Tracking",
        "50,000 pageviews/month",
        "History + Realtime data",
        "1 year data retention",
        "Element Debugging",
        "WP Plugin Monitoring + Audits",
        "Image & Font Flagging",
        "Weekly Email Report",
        "Standard Support",
      ],
    },
    {
      name: "Pro",
      price: 49,
      description: "Advanced monitoring for growing teams",
      features: [
        "Up to 6 sites",
        "Real-Time Performance Tracking",
        "200,000 pageviews/month",
        "History + Realtime data",
        "1 year data retention",
        "Element Debugging",
        "WP Plugin Monitoring + Audits",
        "Image & Font Flagging",
        "Weekly Email Report",
        "Priority Support",
      ],
    },
    {
      name: "Agency",
      price: 149,
      description: "Premium insights for high-traffic clients and agencies",
      features: [
        "Up to 20 sites",
        "Real-Time Performance Tracking",
        "800,000 pageviews/month",
        "History + Realtime data",
        "1 year data retention",
        "Element Debugging",
        "WP Plugin Monitoring + Audits",
        "Image & Font Flagging",
        "Weekly Email Report",
        "Priority Support",
      ],
    },
  ];

  const calculatePrice = (monthlyPrice: number): number => {
    if (billingCycle === "monthly") return monthlyPrice;
    return monthlyPrice * 0.9; // 10% discount for yearly
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-8">
        {/* <h2 className="text-xl font-bold text-primary/80">Choose Your Plan</h2> */}
        <div className="flex items-center gap-4">
          <span>Monthly</span>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={billingCycle === "yearly"}
              onChange={() =>
                setBillingCycle((p) => (p === "monthly" ? "yearly" : "monthly"))
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
          <span>
            Yearly{" "}
            <span className="ml-1 text-green-600 font-semibold">
              (Save 10%)
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {planCards.map((plan) => (
          <PlanCard
            key={plan.name}
            name={plan.name}
            price={plan.price}
            description={plan.description}
            features={plan.features}
            displayPrice={calculatePrice(plan.price)}
            billingCycle={billingCycle}
          />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  name,
  description,
  features,
  displayPrice,
  billingCycle,
}: PlanCardProps & {
  displayPrice: number;
  billingCycle: "monthly" | "yearly";
}) {
  return (
    <div className="border rounded flex flex-col justify-between bg-white dark:bg-secondary-background border-primary/15">
      <div className="h-28 p-6">
        <h3 className="text-lg font-semibold text-primary/80 mb-2">{name}</h3>
        <p className="text-sm text-primary/60 mb-4">{description}</p>
      </div>

      <div className="h-8 py-7 bg-primary/5 flex justify-center items-center">
        <p className="text-2xl font-bold text-blue-500/90 dark:text-amber-200">
          ${displayPrice.toFixed(0)}
          <span className="text-sm font-medium ml-1">
            /month {billingCycle === "yearly" && "(billed yearly)"}
          </span>
        </p>
      </div>

      <ul className="space-y-2 p-6">
        {features.map((feature) => {
          const match = feature.match(/(\d[\d,]*)/);
          const numberPart = match?.[0];
          const [before, after] = numberPart
            ? feature.split(numberPart)
            : [feature, ""];

          return (
            <li
              key={feature}
              className="flex items-start text-xs text-primary/60 relative group"
            >
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 shrink-0" />
              <span>
                {before}
                {numberPart ? (
                  <CustomTooltip
                    trigger={
                      <span className="underline decoration-dotted decoration-primary/40">
                        {numberPart}
                      </span>
                    }
                    side="bottom"
                    content="Tracking throttles on exceed"
                  />
                ) : null}
                {after}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
