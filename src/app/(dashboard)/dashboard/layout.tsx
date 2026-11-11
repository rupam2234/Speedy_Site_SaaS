"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ReactNode, Suspense, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
import SiteContextProvider, { useSiteContext } from "./siteContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  AuthProvider,
  useSupabaseUser,
} from "@/components/utils/supabase/AuthProvider";
import SidebarInsetHeader from "@/components/sidebarDesign/Inset-Header";
import { validatePlan } from "@/components/utils/planValidation/activePlan";
import SidebarSwitcher from "@/components/sidebarDesign/SidebarSwitcher";

interface DashboardLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: { children: ReactNode }) {
  const { selectedSite, role, plan, setPlan, setPlanExpiresAt } = useSiteContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useSupabaseUser();
  const lastNavigatedUrl = useRef("");

  useEffect(() => {
    if (!selectedSite || role === "admin" || role === "expert") return;

    // While the setup flow is being used to connect another site it has no
    // active site on purpose; forcing ?site= in would contradict the intent
    // (and re-point the flow at the previous site).
    // Never rewrite ?site= while the user is in the setup flow. The tour and the
    // URL are the single source of truth for which site is being configured, and
    // the context selection is intentionally cleared/ignored there (adding a new
    // site has no active site on purpose), so forcing it here would re-point the
    // flow at the previous site.
    if (pathname?.startsWith("/dashboard/onboarding")) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("site", selectedSite);
    const currentUrl = `${pathname}?${params.toString()}`;

    if (
      currentUrl !== window.location.pathname + window.location.search &&
      currentUrl !== lastNavigatedUrl.current
    ) {
      lastNavigatedUrl.current = currentUrl;
      router.replace(currentUrl, { scroll: false });
    }
  }, [selectedSite, role, pathname, searchParams, router]);

  // Redirect back to dashboard if no site is selected (customers only)
  useEffect(() => {
    if (selectedSite || role === "admin" || role === "expert") return;

    // The setup page is the gateway: a user with no site yet belongs there (its
    // first step connects one), so never bounce them away.
    if (pathname?.startsWith("/dashboard/onboarding")) return;

    const timeout = setTimeout(() => {
      router.push("/dashboard");
    }, 7000);

    return () => clearTimeout(timeout);
  }, [selectedSite, role, pathname, router]);

  // set active plan
  useEffect(() => {
    if (!user?.id || plan !== null) return; // plan already fetched

    const fetchAndSetPlan = async () => {
      try {
        const activePlan = await validatePlan(user.id);
        const planValue = activePlan.plan ?? "Free";
        setPlan(planValue);
        setPlanExpiresAt(activePlan.expiresAt);
      } catch (err) {
        console.error("Failed to fetch plan:", err);
        setPlan("Free");
        setPlanExpiresAt(null);
      }
    };

    fetchAndSetPlan();
  }, [user?.id, plan, setPlan, setPlanExpiresAt]);

  return (
    <>
      <SidebarSwitcher />
      <SidebarInset className="flex flex-col min-h-screen">
        <SidebarInsetHeader />
        <main className="flex-1 dark:bg-background bg-background">
          {children}
          <Toaster />
        </main>
      </SidebarInset>
    </>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense>
      <AuthProvider>
        <SidebarProvider>
          <SiteContextProvider>
            <LayoutContent>{children}</LayoutContent>
          </SiteContextProvider>
        </SidebarProvider>
      </AuthProvider>
    </Suspense>
  );
}
