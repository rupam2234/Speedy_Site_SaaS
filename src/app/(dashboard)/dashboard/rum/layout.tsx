"use client";

import { validatePlan } from "@/components/utils/planValidation/activePlan";
import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

interface RUMlayoutProps {
  children: ReactNode;
}

export default function RumLayout({ children }: RUMlayoutProps) {
  const user = useSupabaseUser();
  const [plan, setPlan] = useState<string | null>(null); // or type it better if you know the structure
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      if (user?.id) {
        const activePlan: any = await validatePlan(user?.id);
        setPlan(activePlan?.data[0]?.plan);
        setLoading(false);
      }
    };

    fetchPlan();
  }, [user]);

  if (loading) return null;

  if (plan === "Free") {
    return <Fallback />;
  }

  return <>{children}</>;
}

function Fallback() {
  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-full">
      <span className="text-4xl mb-4">🔒</span>
      <h2 className="text-lg font-semibold text-center text-primary/70  mb-2">
        Need an upgraded plan
      </h2>
      <p className="text-sm text-center text-primary/60 mb-8 max-w-xl">
        You’re currently on <strong>FREE</strong> plan.{" "}
        <Link
          className="font-semibold text-indigo-500 cursor-pointer hover:underline"
          href={`/account/subscription`}
        >
          Upgrade your plan
        </Link>{" "}
        to unlock performance insights, advanced analytics, and real time user
        experience debugging.
      </p>
    </div>
  );
}
