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
import { useEffect, useState } from "react";
import { useSupabaseUser } from "../utils/supabase/AuthProvider";
import { useTheme } from "../theme/ThemeProvider";
import { DynamicLogo } from "@/app/(auth)/helpers/dynamicLogo";

// Hook to detect if the screen is mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

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

  const selectSiteCollapsed = isMobile ? false : sidebarOpen ?? false;
  const selectSiteDisabled = pathname.includes("/account");

  const data = {
    user: {
      name: user?.email?.split("@")[0] || "",
      email: user?.email ?? "",
      avatar: "",
      items: [
        {
          title: "Account",
          url: "#",
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
      // {
      //   title: "Lab Reports",
      //   url: "#",
      //   icon: FlaskConical,
      //   isActive: true,
      //   items: [
      //     {
      //       title: "Page",
      //       url: `/dashboard/pages?site=${selectedSite}`,
      //     },
      //   ],
      // },
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
            url: `/dashboard/rum/cwv?site=${selectedSite}`,
          },
          {
            title: "Analytics",
            url: `/dashboard/rum/analytics?site=${selectedSite}`,
          },
          {
            title: "Page Groups",
            url: `/dashboard/rum/pages?site=${selectedSite}`,
          },
          // {
          //   title: "Third Party",
          //   url: `/dashboard/rum/third-party?site=${selectedSite}`,
          // },
          {
            title: "LCP (Images)",
            url: `/dashboard/rum/lcp-images?site=${selectedSite}`,
          },
        ],
      },
      // {
      //   title: "Optimized Image Delivery",
      //   url: "#",
      //   icon: FlaskConical,
      //   isActive: true,
      //   items: [
      //     {
      //       title: "How it works?",
      //       url: `/dashboard#?site=${selectedSite}`,
      //     },
      //     {
      //       title: "Optimize on fly",
      //       url: `/dashboard#?site=${selectedSite}`,
      //     },
      //   ],
      // },
      // {
      //   title: "AI Citation",
      //   url: "#",
      //   icon: Brain,
      //   isActive: false,
      //   items: [
      //     {
      //       title: "Report",
      //       url: `#`,
      //     },
      //   ],
      // },
      {
        title: "Enhancements",
        url: "#",
        icon: FlaskConical,
        isActive: true,
        items: [
          {
            title: "Boost TTFB",
            url: `#`,
          },
          {
            title: "Auto Optimize Images",
            url: `#`,
          },
          {
            title: "WP Optimization",
            url: `https://speedy.site/`,
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
