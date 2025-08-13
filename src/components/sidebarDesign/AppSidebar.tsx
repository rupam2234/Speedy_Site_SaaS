"use client";

import {
  Activity,
  CreditCard,
  HeartPulse,
  LayoutDashboardIcon,
  Settings2,
  User2Icon,
  Waypoints,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "../ui/sidebar";
import { useUser } from "@clerk/nextjs";
import MainNav from "./Main-Nav";
import FooterNav from "./Footer-Nav";
import { SelectSite } from "../utils/SiteSelect";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const { user } = useUser();
  const { state } = useSidebar();
  const { selectedSite } = useSiteContext();
  const pathname = usePathname();

  const isMobile = useIsMobile();

  const sidebarOpen =
    state === "expanded" ? false : state === "collapsed" ? true : null;

  // Always expanded on mobile, default logic on desktop
  const selectSiteCollapsed = isMobile ? false : sidebarOpen ?? false;
  const selectSiteDisabled = pathname.includes("/account");

  const data = {
    user: {
      name: user?.fullName?.toString() ?? "",
      email:
        user?.emailAddresses
          ?.map(({ emailAddress }) => emailAddress)
          .join(", ") || "",
      avatar: "",
      items: [
        {
          title: "Account",
          url: "/account",
          icon: User2Icon,
        },
        {
          title: "Billing",
          url: "/account/billing",
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
            title: "LCP Images",
            url: `/dashboard/rum/lcp-images?site=${selectedSite}`,
          },
          {
            title: "Page Groups",
            url: `/dashboard/rum/pages?site=${selectedSite}`,
          },
        ],
      },
      {
        title: "User Journey",
        url: "#",
        icon: Waypoints,
        isActive: true,
        items: [
          {
            title: "Funnels",
            url: `/dashboard/funnels?site=${selectedSite}`,
          },
          {
            title: "Configure Journey",
            url: `/dashboard/funnels/configure?site=${selectedSite}`,
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
            <SelectSite
              collapsed={selectSiteCollapsed}
              disabled={selectSiteDisabled}
            />
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
          WebVitals={{
            title: "Core Web Vitals",
            url: `/dashboard/cwv?site=${selectedSite}`,
            icon: HeartPulse,
            isActive: false,
          }}
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
