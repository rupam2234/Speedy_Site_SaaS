"use client";

import {
  BellIcon,
  BookOpen,
  ChartLine,
  CreditCard,
  GroupIcon,
  LayoutDashboardIcon,
  Link2,
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
import { useSiteContext } from "@/app/(dashboard)/siteContext";

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const { state } = useSidebar();
  const { selectedSite } = useSiteContext();

  const sidebarOpen =
    state === "expanded" ? false : state === "collapsed" ? true : null;

  const site = selectedSite || "default-site"; // or fallback

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
          url: "/billing",
          icon: CreditCard,
        },
        {
          title: "Notification",
          url: "/notification",
          icon: BellIcon,
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
            title: "Pages",
            url: `/dashboard/${site}/pages`,
          },
          {
            title: "Lab Monitoring",
            url: `/dashboard/${site}/lab`,
          },
          {
            title: "Real User Monitoring",
            url: `/dashboard/${site}/rum`,
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
            title: "Page Profiling",
            url: "/dashboard/new-site",
          },
          {
            title: "Optimization Assistance",
            url: "/dashboard/orders",
          },
          {
            title: "Settings",
            url: "/dashboard/project-settings",
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
      {
        title: "Documentation",
        url: "#",
        icon: BookOpen,
        isActive: false,
        items: [
          {
            title: "Introduction",
            url: "#",
          },
          {
            title: "Get Started",
            url: "#",
          },
          {
            title: "Tutorials",
            url: "#",
          },
          {
            title: "Changelog",
            url: "#",
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
            <SelectSite collapsed={sidebarOpen ?? false} />
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
