"use client";

import { PackageCheck, Globe, ShieldCheck } from "lucide-react";
import { OrderChatPanel } from "@/components/chat";

interface OrderInfo {
  order_id: string;
  website_name: string;
  website_address: string;
  order_status: boolean;
  product_type?: string | null;
}

interface ManagedOrderDashboardProps {
  order?: OrderInfo | null;
  site?: string | null;
}

function OrderStatusPill({ status }: { status: "active" | "paused" | "pending" }) {
  const styles: Record<typeof status, string> = {
    active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20",
    paused: "bg-amber-500/15 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20",
    pending: "bg-primary/15 text-primary dark:text-primary-foreground/80 dark:bg-primary/20",
  };

  const labels: Record<typeof status, string> = {
    active: "Active",
    paused: "Paused",
    pending: "Pending",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}

// Customer view displaying active managed optimization details and direct expert communication.
export default function ManagedOrderDashboard({ order, site }: ManagedOrderDashboardProps) {
  const website = order?.website_name || site || "Your Website";
  const address = order?.website_address || `https://${website}`;
  const orderId = order?.order_id;

  return (
    <div className="min-h-screen fade-in-10 duration-500">
      <div className="mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 dark:bg-primary/80">
              <PackageCheck
                className="h-5 w-5 text-primary/80 dark:text-primary-foreground/80"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Managed WordPress Optimization</p>
              <p className="text-xs text-primary/60">
                {orderId ? `Order ID: ${orderId}` : `Site: ${website}`}
              </p>
            </div>
          </div>
          <OrderStatusPill status={order?.order_status ? "active" : "pending"} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Order Details Card */}
          <div className="lg:col-span-1 rounded-xl border border-primary/10 bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Order Details
            </p>
            <dl className="flex flex-col gap-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Website</dt>
                <dd className="text-sm font-medium text-foreground flex items-center gap-1 mt-0.5">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <a
                    href={address}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline text-primary"
                  >
                    {website}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Service Plan</dt>
                <dd className="text-sm font-medium text-foreground capitalize">
                  {order?.product_type || "Managed WordPress Growth"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Service SLA</dt>
                <dd className="text-sm font-medium text-foreground">
                  Continuous RUM monitoring with monthly expert audits
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Dedicated Expert</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Assigned Performance Expert
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Customer-Expert Live Communication Channel */}
          <div className="lg:col-span-2">
            {orderId ? (
              <OrderChatPanel
                orderId={orderId}
                channelType="client"
                title="Direct Expert Communication"
                subtitle="Chat directly with your assigned WordPress performance expert"
              />
            ) : (
              <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
                Initializing communication channel...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
