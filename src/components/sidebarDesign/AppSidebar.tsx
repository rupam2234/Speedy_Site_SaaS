"use client";

import {
  Activity,
  CreditCard,
  FlaskConical,
  GroupIcon,
  HeartPulse,
  LayoutDashboardIcon,
  Settings,
  User2Icon,
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

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const { state } = useSidebar();
  const { selectedSite } = useSiteContext();

  const pathname = usePathname();

  const sidebarOpen =
    state === "expanded" ? false : state === "collapsed" ? true : null;

  const site = selectedSite; // or fallback

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
        {
          title: "Settings",
          url: "/account/settings",
          icon: Settings,
        },
      ],
    },
    navMain: [
      {
        title: "Lab Reports",
        url: "#",
        icon: FlaskConical,
        isActive: true,
        items: [
          {
            title: "Page Groups",
            url: `/dashboard/${site}/pages`,
          },
          {
            title: "Lab Settings",
            url: `/dashboard/${site}/lab-settings`,
          },
        ],
      },
      {
        title: "Real User Monitoring",
        url: "#",
        icon: Activity,
        isActive: true,
        items: [
          {
            title: "Overview",
            url: `/dashboard/${site}/rum/overview`,
          },
          {
            title: "Web Vitals",
            url: `/dashboard/${site}/rum/cwv`,
          },
          {
            title: "Analytics",
            url: `/dashboard/${site}/rum/analytics`,
          },
          {
            title: "Pages",
            url: `/dashboard/${site}/rum/pages`,
          },
          {
            title: "User Session",
            url: `/dashboard/${site}/rum/session`,
          },
          {
            title: "Configuration",
            url: `/dashboard/${site}/rum/configuration`,
          },
        ],
      },
      {
        title: "Teams",
        url: "#",
        icon: GroupIcon,
        isActive: false,
        items: [{ title: "Manage Teams", url: "#" }],
      },
      // {
      //   title: "Documentation",
      //   url: "#",
      //   icon: BookOpen,
      //   isActive: false,
      //   items: [
      //     {
      //       title: "Introduction",
      //       url: "#",
      //     },
      //     {
      //       title: "Get Started",
      //       url: "#",
      //     },
      //     {
      //       title: "Tutorials",
      //       url: "#",
      //     },
      //     {
      //       title: "Changelog",
      //       url: "#",
      //     },
      //   ],
      // },
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
            {/* do not display site selector when we are at account or child pages */}
            {pathname.includes("/account") === false ? (
              <SelectSite collapsed={sidebarOpen ?? false} disabled={false} />
            ) : (
              <SelectSite collapsed={sidebarOpen ?? false} disabled />
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <MainNav
          DashboardItems={{
            title: "Dashboard",
            url: `/dashboard/${selectedSite}`,
            icon: LayoutDashboardIcon,
            isActive: false,
          }}
          WebVitals={{
            title: "Core Web Vitals",
            url: `/dashboard/${site}/cwv`,
            icon: HeartPulse,
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
