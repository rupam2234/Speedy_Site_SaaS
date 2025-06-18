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
import { SelectDemo } from "../utility/SiteSelect";

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const { state } = useSidebar();

  const sidebarOpen =
    state === "expanded" ? false : state === "collapsed" ? true : null;

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
    // AppHeader: {
    //   Name: "SpeedySense",
    //   // logo: GalleryVerticalEnd, // Removed, as SelectSite will handle logo display
    //   AccountType: "Personal",
    // },
    navMain: [
      {
        title: "Reports",
        url: "#",
        icon: ChartLine,
        isActive: true,
        items: [
          {
            title: "CrUX Report",
            url: "/dashboard/reports",
          },
          {
            title: "Synthetic Monitoring",
            url: "/dashboard/monitor",
          },
          {
            title: "RUM",
            url: "/dashboard/rum-monitoring",
          },
          {
            title: "Page Profiling",
            url: "/dashboard/profiling",
          },
        ],
      },
      {
        title: "Websites",
        url: "#",
        icon: Link2,
        isActive: true,
        items: [
          {
            title: "Add New Site",
            url: "/dashboard/new-site",
          },
          {
            title: "All Sites",
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
    <Sidebar collapsible="icon" {...props} className="dark:border-muted">
      <SidebarHeader className="mb-5 mt-2">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <SelectDemo collapsed={sidebarOpen ?? false} />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <MainNav
          NavItems={data.navMain}
          DashboardItems={{
            title: "Dashboard",
            url: "/dashboard",
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
