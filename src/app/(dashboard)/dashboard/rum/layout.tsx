"use client";

import {
  UpgradeFallback,
  NoSiteSelected,
  LoadingAnimation,
} from "@/components/theme";
import { ReactNode } from "react";
import { useSiteContext } from "../siteContext";

interface RumLayoutProps {
  children: ReactNode;
}

export default function RumLayout({ children }: RumLayoutProps) {
  const { plan, orders, isLoadingOrders } = useSiteContext();

  // Show nothing until plan is loaded
  if (plan === null) return null;

  if (isLoadingOrders) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  // No site selected
  if (!orders || orders.length === 0) {
    return <NoSiteSelected />;
  }

  // if (!selectedSite) return <NoSiteSelected />;

  // Selected site, free plan
  if (plan === "Free") return <UpgradeFallback />;

  // Selected site and paid plan
  return <>{children}</>;
}
