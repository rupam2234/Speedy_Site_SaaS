"use client";

import { UpgradeFallback, NoSiteSelected } from "@/components/theme";
import { ReactNode } from "react";
import { useSiteContext } from "../siteContext";

interface RumLayoutProps {
  children: ReactNode;
}

export default function RumLayout({ children }: RumLayoutProps) {
  const { plan, selectedSite } = useSiteContext();

  // Show nothing until plan is loaded
  if (plan === null) return null;

  // No site selected
  if (!selectedSite) return <NoSiteSelected />;

  // Selected site, free plan
  if (plan === "Free") return <UpgradeFallback />;

  // Selected site and paid plan
  return <>{children}</>;
}
