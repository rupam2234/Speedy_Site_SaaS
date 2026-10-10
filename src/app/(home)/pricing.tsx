"use client";

import { BadgeCheck, CheckCircle } from "lucide-react";
import { PlanType } from "../account/subscription";
import { CustomTooltip } from "@/components/theme";
import { PlanKey } from "../account/subscription/plans";
import { CheckoutProps } from "../api/subscriptions/stripe/checkout/route";

type PricingCardProps = {
  name: PlanType;
  price: number;
  description: string;
  features: string[];
  current: boolean;
  highlight?: boolean;
  defaultPrice: number;
  displayPrice: number;
  billingCycle: "monthly" | "yearly";
};

const MANAGED_WP = "Managed WordPress Performance";

function isManagedWP(name: string) {
  return name === MANAGED_WP;
}

async function handleSubscribe({ priceKey, mode }: CheckoutProps) {
  if (!priceKey) {
    console.error("Missing price id");
    return;
  }
  try {
    const res = await fetch("/api/subscriptions/stripe/checkout", {
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

export function PricingCardContent({
  props,
  needCtaButtons = false,
}: {
  props: PricingCardProps;
  needCtaButtons?: boolean;
}) {
  const managedWP = isManagedWP(props.name || "");

  return (
    <div
      className={`p-6 border rounded-md shadow-2xl ${
        managedWP ? "col-span-1 md:col-span-2" : ""
      } flex flex-col transition ${
        props.highlight
          ? "bg-blue-50 dark:bg-secondary-background border-blue-300"
          : "bg-white dark:bg-secondary-background border-primary/15"
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <h3 className="text-lg font-semibold text-primary/80">
              {managedWP
                ? "Managed WordPress Performance Optimization Service"
                : props.name}
            </h3>

            {props.name === "Pro" && (
              <div className="px-2 text-[10px] py-1 text-primary-foreground dark:text-primary font-semibold bg-green-500/60">
                Most Popular
              </div>
            )}
          </div>

          {props.highlight && (
            <BadgeCheck className="w-4 h-4 text-blue-600 shrink-0" />
          )}
        </div>

        <div className="h-14">
          <p className="text-sm text-primary/60 mt-1">{props.description}</p>
        </div>

        <div className="-mx-6 bg-accent/80 dark:bg-accent-foreground/20 w-[calc(100%+3rem)] px-6 py-4">
          <p className="text-2xl font-bold text-blue-500/90 dark:text-amber-200">
            <span>
              $
              {!managedWP
                ? props.displayPrice.toFixed(0)
                : props.defaultPrice.toFixed(0)}
            </span>
            <span className="text-sm font-medium ml-1">
              {!managedWP ? "/month" : "(One time fee / not a subscription)"}{" "}
              {!managedWP &&
                props.billingCycle === "yearly" &&
                "(billed yearly)"}
            </span>
          </p>
        </div>

        <ul className="mt-4 space-y-2">
          {props.features.map((feature) => {
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
                className="flex items-start text-xs text-primary/60 relative group"
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

      {needCtaButtons && (
        <button
          disabled={props.current}
          onClick={() => {
            const key =
              props.billingCycle === "monthly"
                ? !managedWP
                  ? props.name
                  : `ManagedWp`
                : !managedWP
                  ? `${props.name}_yearly`
                  : `ManagedWp`;

            if (!props.current)
              handleSubscribe({
                priceKey: key as unknown as PlanKey,
                mode: managedWP ? "payment" : "subscription",
              });
          }}
          className={`mt-6 w-full text-sm cursor-pointer font-medium py-2 rounded-md transition-all duration-150 ${props.current ? "bg-blue-500/30 text-primary cursor-not-allowed" : props.highlight ? `bg-blue-600 text-white hover:bg-blue-700` : `${managedWP ? "bg-green-700 text-primary-foreground hover:bg-green-700/90 hover:text-primary-foreground" : "bg-gray-100 text-gray-800 hover:bg-blue-500/30 hover:text-primary"}`}`}
        >
          {props.current
            ? "✓ Current Plan"
            : !managedWP
              ? `Change to ${props.name}`
              : `Get Managed WP Performance Service`}
        </button>
      )}
    </div>
  );
}
