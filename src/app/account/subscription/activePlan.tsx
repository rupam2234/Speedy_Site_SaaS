"use client";

import { useEffect, useState } from "react";
import { PlanType } from "./page";
import Link from "next/link";

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

  useEffect(() => {
    async function getBillingHistory() {
      try {
        const res = await fetch("/api/subscriptions/stripe/billing-history");
        if (!res.ok) throw new Error("Failed to fetch invoices");
        const data: any = await res.json();
        setInvoices(data.invoices);
      } catch (err) {
        console.error(err);
        setInvoices([]);
      }
    }

    getBillingHistory();
  }, []);

  console.log(invoices?.data);

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
          Amount due? $
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
        className="w-full text-sm bg-primary text-primary-foreground py-2 rounded-md transition"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide Billing History" : "View Billing History"}
      </button>

      {expanded && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-primary/90 mb-2">
            Billing History
          </h3>
          <ul className="text-sm text-primary/80 space-y-1">
            {invoices?.data?.map((x: any) => (
              <li
                key={x.number}
                className="flex justify-between border-b border-gray-100 py-1"
              >
                <span>${(x.amount_paid / 100).toFixed(2)}</span>
                <span>{new Date(x.created * 1000).toLocaleString()}</span>
                <Link
                  href={x.hosted_invoice_url}
                  className={`ml-2 hover:underline ${
                    x.status === "paid" ? "text-green-600" : "text-red-600"
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Invoice
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
