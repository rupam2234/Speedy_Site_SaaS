"use client";

import { LoadingAnimation } from "@/components/theme";
import { PackageOpen } from "lucide-react";
import { useEffect, useState } from "react";

export default function Main() {
  const [managedOrders, setManagedOrders] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    ValidateManagedOrders();
  }, []);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (managedOrders && managedOrders.length === 0) {
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
        <p className="text-sm text-primary/60">
          This site isn&apos;t enrolled in managed WordPress performance
          optimization. Select a different site to continue.
        </p>
      </div>
    );
  }

  return <></>;

  async function ValidateManagedOrders() {
    try {
      const res = await fetch("/api/orders/managed/validate", {
        method: "GET",
        headers: { "Conetent-Type": "application/json" },
      });

      if (!res.ok) {
        const errorRes: any = await res.json();
        setManagedOrders([]);
        setLoading(false);
        throw new Error(errorRes.message);
      }

      const body = await res.json();
      setManagedOrders(body);
      setLoading(false);
    } catch (error: any) {
      console.error(
        error.message || "Something went wrong in managed order validation",
      );
    }
  }
}
