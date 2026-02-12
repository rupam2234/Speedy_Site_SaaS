"use client";

import { Fallback, NoSiteSelected } from "@/components/theme";
import { validatePlan } from "@/components/utils/planValidation/activePlan";
import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import { ReactNode, useEffect } from "react";
import { useSiteContext } from "../siteContext";

interface RumLayoutProps {
  children: ReactNode;
}

export default function RumLayout({ children }: RumLayoutProps) {
  const user = useSupabaseUser();
  const { plan, setPlan, selectedSite } = useSiteContext();

  useEffect(() => {
    if (!user?.id || plan !== null) return; // already fetched

    const key = `${user.id}-plan`;

    const fetchAndCachePlan = async () => {
      // Check sessionStorage first
      const cached = sessionStorage.getItem(key);
      if (cached) {
        setPlan(cached);
        return;
      }

      try {
        const activePlan: any = await validatePlan(user.id);
        const planValue = activePlan?.data?.[0]?.plan ?? "Free";
        setPlan(planValue);
        sessionStorage.setItem(key, planValue);
      } catch (err) {
        console.error("Failed to fetch plan:", err);
        setPlan("Free");
        sessionStorage.setItem(key, "Free");
      }
    };

    fetchAndCachePlan();
  }, [user?.id, plan, setPlan]);

  // Show nothing until plan is loaded
  if (plan === null) return null;

  if (!selectedSite) {
    <NoSiteSelected />;
  }

  if (selectedSite && plan === "Free") {
    return <Fallback />;
  }

  return <>{children}</>;
}
