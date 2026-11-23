"use client";

import { LoadingAnimation } from "@/components/theme";
import { PackageOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { ManagedOrderDashboard } from ".";
import Link from "next/link";

interface OrderInfo {
  order_id: string;
  website_name: string;
  website_address: string;
  order_status: boolean;
  product_type?: string | null;
}

export default function Main() {
  const [managedOrder, setManagedOrder] = useState<boolean>(false);
  const [orderData, setOrderData] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { selectedSite } = useSiteContext();

  useEffect(() => {
    if (!selectedSite) return;

    const validate = async () => {
      try {
        const [validateRes, orderRes] = await Promise.all([
          fetch("/api/orders/managed/validate", {
            headers: {
              site: selectedSite,
            },
          }),
          fetch(`/api/orders/managed/check?site=${encodeURIComponent(selectedSite)}`),
        ]);

        let isValid: boolean = false;
        try {
          isValid = await validateRes.json();
        } catch {
          isValid = false;
        }

        let isManaged = isValid;
        if (orderRes.ok) {
          const checkJson = await orderRes.json();
          if (checkJson.order) {
            setOrderData(checkJson.order);
            if (checkJson.order.product_type === "managed_wp") {
              isManaged = true;
            }
          }
        }
        setManagedOrder(isManaged);
      } finally {
        setLoading(false);
      }
    };

    validate();
  }, [selectedSite]);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (!loading && managedOrder === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 pb-32 text-center fade-in-10 duration-500">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 dark:bg-primary/80">
          <PackageOpen
            className="h-6 w-6 dark:text-primary-foreground/80 text-primary/80"
            strokeWidth={1.5}
          />
        </div>
        <p className="text-sm font-medium text-primary">
          No Managed WordPress Optimization
        </p>
        <p className="text-sm text-primary/70">
          This site isn&apos;t enrolled in managed WordPress performance
          optimization. Please select a different site to continue.
        </p>
        <p className="text-xs text-primary/60">
          <strong>Hint:</strong>{" "}
          <span>
            If you haven&apos;t assigned a managed performance order before it
            can be placed{" "}
            <Link className="text-blue-500/80" href={"/pricing"}>
              at the pricing page
            </Link>
            .
          </span>
        </p>
      </div>
    );
  }

  return <ManagedOrderDashboard order={orderData} site={selectedSite} />;
}
