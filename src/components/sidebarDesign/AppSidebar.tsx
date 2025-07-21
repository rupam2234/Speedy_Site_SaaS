"use client";

import {
  ChartLine,
  CreditCard,
  GroupIcon,
  LayoutDashboardIcon,
  Link2,
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
        title: "Reports",
        url: "#",
        icon: ChartLine,
        isActive: true,
        items: [
          {
            title: "Core Web Vitals",
            url: `/dashboard/${site}/cwv`,
          },
          {
            title: "Page Benchmarks",
            url: `/dashboard/${site}/pages`,
          },
          {
            title: "Real User Monitoring",
            url: `/dashboard/${site}/rum`,
          },
          {
            title: "Site Settings",
            url: `/dashboard/${site}/site-settings`,
          },
        ],
      },
      {
        title: "Boost Performance",
        url: "#",
        icon: Link2,
        isActive: true,
        items: [
          {
            title: "Optimization Assistance",
            url: "/dashboard/orders",
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
          NavItems={data.navMain}
          DashboardItems={{
            title: "Dashboard",
            url: `/dashboard/${selectedSite}`,
            icon: LayoutDashboardIcon,
            isActive: false,
          }}
        />
      </SidebarContent>
      <SidebarFooter>
        <FooterNav items={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
