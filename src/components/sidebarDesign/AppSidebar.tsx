"use client";

import {
  Activity,
  CreditCard,
  FlaskConical,
  LayoutDashboardIcon,
  Settings2,
  User2Icon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "../ui/sidebar";
import MainNav from "./Main-Nav";
import FooterNav from "./Footer-Nav";
import { SelectSite } from "../utils/SiteSelect";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { usePathname } from "next/navigation";
import { useSupabaseUser } from "../utils/supabase/AuthProvider";
import { useTheme } from "../theme/ThemeProvider";
import { DynamicLogo } from "@/app/(auth)/helpers/dynamicLogo";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const { selectedSite } = useSiteContext();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const user = useSupabaseUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const sidebarOpen =
    state === "expanded" ? false : state === "collapsed" ? true : null;

  const selectSiteCollapsed = isMobile ? false : (sidebarOpen ?? false);
  const selectSiteDisabled = pathname.includes("/account");

  const data = {
    user: {
      name: user?.email?.split("@")[0] || "",
      email: user?.email ?? "",
      avatar: "",
      items: [
        {
          title: "Account",
          url: "/account",
          icon: User2Icon,
        },
        {
          title: "Billing",
          url: "/account/subscription",
          icon: CreditCard,
        },
      ],
    },
    navMain: [
      {
        title: "Real User Monitoring",
        url: "#",
        icon: Activity,
        isActive: true,
        items: [
          {
            title: "Overview",
            url: `/dashboard/rum/overview?site=${selectedSite}`,
          },
          {
            title: "Web Vitals",
            url: `/dashboard/rum/web-vitals?site=${selectedSite}`,
          },
          {
            title: "Page Groups",
            url: `/dashboard/rum/pages?site=${selectedSite}`,
          },
        ],
      },
      {
        title: "Enhancements",
        url: "#",
        icon: FlaskConical,
        isActive: true,
        items: [
          {
            title: "LCP Images",
            url: `/dashboard/rum/lcp-images?site=${selectedSite}`,
          },
          {
            title: "Cloudflare Lab",
            url: `/dashboard/cloudflare?site=${selectedSite}`,
          },
        ],
      },
    ],
  };

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="dark:border-muted bg-muted-foreground"
    >
      <SidebarHeader className="mb-5 mt-2">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            {selectSiteDisabled === true ? (
              <div className="px-2">
                <DynamicLogo isDark={isDark} />
              </div>
            ) : (
              <SelectSite collapsed={selectSiteCollapsed} disabled={false} />
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <MainNav
          DashboardItems={{
            title: "Dashboard",
            url: `/dashboard?site=${selectedSite}`,
            icon: LayoutDashboardIcon,
            isActive: false,
          }}
          // WebVitals={{
          //   title: "Core Web Vitals",
          //   url: `/dashboard/cwv?site=${selectedSite}`,
          //   icon: HeartPulse,
          //   isActive: false,
          // }}
          Settings={{
            title: "Settings",
            url: `/dashboard/settings?site=${selectedSite}`,
            icon: Settings2,
            isActive: false,
          }}
          NavItems={data.navMain}
        />
      </SidebarContent>

      <SidebarFooter>
        <FooterNav items={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
