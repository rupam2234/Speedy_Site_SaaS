"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";

export function useCheckPlan() {
  const { has } = useAuth();
  const { setActivePlan } = useSiteContext();

  useEffect(() => {
    const check = async () => {
      type ClerkPlan = "free_user" | "basic_plan" | "pro";
      const clerkPlans: ClerkPlan[] = ["free_user", "basic_plan", "pro"];

      if (has) {
        const matchedPlan = clerkPlans.find((plan) => has({ plan }));
        if (matchedPlan) {
          setActivePlan(matchedPlan);
        }
      }
    };

    check();
  }, [has, setActivePlan]);
}
