"use client";

import { useEffect, useState } from "react";
import { PlanType } from "./page";
import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function ActivePlanCard({
  userPlan,
  usage,
}: {
  userPlan: PlanType;
  usage: {
    siteSlotsUsed: number | undefined;
    siteSlotsTotal: string;
    nextBillingDate: string | null | undefined;
    lastInvoiceDate: string | undefined;
    computed_usage_limit: number | undefined;
    current_usage: number | undefined;
  };
}) {
  const [expanded, setExpanded] = useState(true);
  const [invoices, setInvoices] = useState<any>();
  const [scrollTop, setScrollTop] = useState<number>(0);

  const { theme } = useTheme();

  useEffect(() => {
    async function getBillingHistory() {
      try {
        const res = await fetch("/api/subscriptions/stripe/billing-history");

        const body: any = await res.json();

        if (!res.ok) {
          throw new Error(body.error);
        }

        setInvoices(body.invoices);
      } catch (err) {
        console.error(err);
        setInvoices([]);
      }
    }

    getBillingHistory();
  }, []);

  const nextBillingDateText = usage.nextBillingDate
    ? new Date(usage.nextBillingDate).toLocaleString("en-US", {
        timeZone: "UTC",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "N/A";

  const quotaUsagePercentage =
    usage.current_usage !== undefined &&
    usage.computed_usage_limit !== undefined
      ? (usage.current_usage / usage.computed_usage_limit) * 100
      : 0;

  const WINDOW_HEIGHT = 300; // in pixel
  const ROW_HEIGHT = 40; // in px

  const topIndex = Math.floor(scrollTop / ROW_HEIGHT);
  const rowsInsideWindow = Math.ceil(WINDOW_HEIGHT / ROW_HEIGHT);
  const bottomIndex = topIndex + rowsInsideWindow;

  const rowsToDisplay = invoices && invoices.data.slice(topIndex, bottomIndex);

  return (
    <div className="bg-primary-foreground dark:bg-secondary-background border border-primary/20 rounded-sm p-6">
      <h2 className="text-[16px] font-medium text-primary/90 mb-4">
        Current plan info:
      </h2>

      <div className="text-sm text-primary/90 space-y-2 mb-5 pb-2 border-b-2 border-dashed">
        <p>
          Plan: <strong>{userPlan}</strong>
        </p>
        <p>
          Active Sites: <strong>{usage.siteSlotsUsed}</strong>
        </p>
        <p>
          Next Billing Date: <strong>{nextBillingDateText}</strong>
        </p>
        <p>
          Amount due: $
          <strong>
            {invoices?.data
              ?.reduce((total: number, x: any) => total + x.amount_due, 0)
              .toFixed(2)}
          </strong>
        </p>
      </div>

      <div className="text-sm mb-5 text-primary/80 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium">Usage</p>
          <p className="text-muted-foreground">
            {usage.current_usage} / {usage.computed_usage_limit} (
            {quotaUsagePercentage.toFixed(2)}%)
          </p>
        </div>

        <div className="w-full h-2 bg-primary/10 rounded-full relative overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${quotaUsagePercentage}%` }}
          />
        </div>
      </div>

      <button
        className="w-full cursor-pointer text-sm bg-primary text-primary-foreground py-2 rounded-md transition"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide Billing History" : "View Billing History"}
      </button>

      {expanded && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-primary/90 mb-2">
            Billing History
          </h3>
          {rowsToDisplay ? (
            <>
              <div
                style={{
                  position: "relative",
                  height: WINDOW_HEIGHT,
                  overflow: "auto",
                  scrollbarColor:
                    theme === "light" ? "#dfdfdf #f5f5f5" : "#343434 #1c1c1c",
                  scrollbarWidth: "thin",
                }}
                className="text-sm"
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
              >
                <div
                  style={{
                    position: "relative",
                    height: rowsToDisplay.length * ROW_HEIGHT,
                  }}
                >
                  {rowsToDisplay.map((x: any, index: number) => {
                    const actualIndex = index + topIndex;

                    return (
                      <div
                        key={index}
                        style={{
                          position: "absolute",
                          top: actualIndex * ROW_HEIGHT,
                          left: 0,
                          right: 0,
                          height: ROW_HEIGHT,
                          borderBottom: `1px solid ${theme === "light" ? `#dfdfdf` : `#343434`}`,
                        }}
                        className="flex justify-between items-center"
                      >
                        <span>${(x.amount_paid / 100).toFixed(2)}</span>
                        <span>
                          {new Date(x.created * 1000).toLocaleString()}
                        </span>
                        <Link
                          href={x.hosted_invoice_url}
                          className={`ml-2 hover:underline ${
                            x.status === "paid"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Invoice
                        </Link>
                      </div>
                    );
                  })}
                  {/* {invoices} */}
                </div>
              </div>
            </>
          ) : (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="flex justify-between border-b border-gray-100 py-1 animate-pulse"
                >
                  <span className="h-4 w-16 bg-gray-200 rounded" />
                  <span className="h-4 w-32 bg-gray-200 rounded" />
                  <span className="h-4 w-14 bg-gray-200 rounded ml-2" />
                </li>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
