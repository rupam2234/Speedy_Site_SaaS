"use client";

import { useEffect } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { useRouter } from "next/navigation";
import { useCheckPlan } from "./useCheckPlan";

export function PlanValidation() {
  const { activePlan } = useSiteContext();
  const router = useRouter();

  useCheckPlan();

  useEffect(() => {
    const allowedPlans = ["free_user", "basic_plan", "pro"];

    if (!allowedPlans.includes(activePlan)) {
      router.prefetch("/account/billing");
      router.push("/account/billing");
    }
  }, [activePlan, router]);

  return null;
}
