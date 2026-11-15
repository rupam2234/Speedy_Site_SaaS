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
  const { selectedSite, orders, isLoadingOrders } = useSiteContext();

  if (isLoadingOrders || !selectedSite) {
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

  // Paid PER SITE, not per account. The order row is created unpaid while the
  // site is being connected and only flips to order_status = true when
  // payment completes, so a site that is still pending stays CrUX-only even
  // when the account has other paid sites.
  const selectedOrder = orders.find((o) => o.website_name === selectedSite);
  if (selectedOrder?.order_status !== true) return <UpgradeFallback />;

  // Selected site, paid for
  return <>{children}</>;
}
