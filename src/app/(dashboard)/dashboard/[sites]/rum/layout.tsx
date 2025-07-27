"use client";

import { PlanValidation } from "@/components/utils/activePlanValidation";
import { Protect } from "@clerk/nextjs";
import { ReactNode } from "react";

interface RumLayoutProps {
  children: ReactNode;
}

export default function RumLayout({ children }: RumLayoutProps) {
  PlanValidation(); // redirect to billing if no active plan

  function fallback() {
    return (
      <div className="flex flex-col items-center justify-center md:mt-[-150px] min-h-screen p-6">
        <span className="text-4xl mb-4">🔒</span>
        <h2 className="text-[16px] font-normal text-center text-primary">
          You need at least the pro plan to view real user monitoring report.
        </h2>
        <p>
          Please visit <strong>account</strong> {">"} <strong>billing</strong>{" "}
          to check your active plan.
        </p>
      </div>
    );
  }

  return (
    <Protect plan="pro" fallback={fallback()}>
      {children}
    </Protect>
  );
}
