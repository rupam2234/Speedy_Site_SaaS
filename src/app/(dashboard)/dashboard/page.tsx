"use client";

import { useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";
import { useSiteContext } from "../siteContext";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import { usePathname, useRouter } from "next/navigation";

export default function Dashboard() {
  const { selectedSite } = useSiteContext();
  const pathname = usePathname();
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);

  const isDashboardRoot = pathname === "/dashboard";

  // Wait for 8 seconds before showing "Select a website" message
  useEffect(() => {
    if (!selectedSite && isDashboardRoot) {
      const timeout = setTimeout(() => {
        setShowPrompt(true);
      }, 8000);

      return () => clearTimeout(timeout);
    }
  }, [selectedSite, isDashboardRoot]);

  // Redirect when selectedSite is available and still on /dashboard
  useEffect(() => {
    if (selectedSite && isDashboardRoot) {
      router.replace(`/dashboard/${selectedSite}`);
    }
  }, [selectedSite, isDashboardRoot, router]);

  // Render logic
  if (!selectedSite && isDashboardRoot && !showPrompt) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  if (!selectedSite && isDashboardRoot && showPrompt) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <PlusCircle className="w-10 h-10 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Select a website</h2>
        <p className="text-muted-foreground mt-1">
          You haven&apos;t selected a website yet. Please select one to get
          started.
        </p>
      </div>
    );
  }

  return null;
}
