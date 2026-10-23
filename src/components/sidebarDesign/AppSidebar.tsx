"use client";

import {
  Activity,
  CircleGauge,
  CreditCard,
  FlaskConical,
  Settings2,
  User2Icon,
  Wrench,
  ClipboardList,
  UserCog,
  ListTodo,
  LayoutDashboardIcon,
  LifeBuoy,
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
import { SelectSite } from "../utils/siteSelector";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { usePathname } from "next/navigation";
import { useTheme } from "../theme/ThemeProvider";
import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import { SpeedySiteLogo } from "@/components/theme/logo";
import { useIsMobile } from "@/components/theme/use-mobile";

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const { selectedSite, role, roleLoading } = useSiteContext();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const user = useSupabaseUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Show skeleton while role is loading to avoid flash of default nav
  if (roleLoading) {
    return (
      <Sidebar
        collapsible="icon"
        {...props}
        className="dark:border-muted z-100 bg-muted-foreground"
      >
        <SidebarHeader className="mb-5 mt-2">
          <div className="flex gap-4 items-center">
            <div className="px-2">
              <SpeedySiteLogo isDark={isDark} />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="space-y-2 p-2 mt-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-8 w-full bg-muted animate-pulse rounded"
              />
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="space-y-2 p-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-8 w-1/2 bg-muted animate-pulse rounded"
              />
            ))}
          </div>
        </SidebarFooter>
      </Sidebar>
    );
  }

  const sidebarOpen =
    state === "expanded" ? false : state === "collapsed" ? true : null;

  const selectSiteCollapsed = isMobile ? false : (sidebarOpen ?? false);
  const selectSiteDisabled = pathname.includes("/account");

  const isAdmin = role === "admin";
  const isExpert = role === "expert";

  // ─── ADMIN-ONLY NAV (clean, no site selector, no other sections) ───
  if (isAdmin) {
    const adminNav = [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboardIcon, isActive: pathname === "/dashboard" },
      { title: "Orders", url: "/dashboard/orders", icon: ClipboardList, isActive: pathname === "/dashboard/orders" },
      { title: "Unassigned Queue", url: "/dashboard/queue", icon: ListTodo, isActive: pathname === "/dashboard/queue" },
      { title: "Support Tickets", url: "/dashboard/tickets", icon: LifeBuoy, isActive: pathname === "/dashboard/tickets" },
      { title: "Developers", url: "/dashboard/experts", icon: UserCog, isActive: pathname === "/dashboard/experts" },
    ];

    const adminUser = {
      name: user?.user_metadata.name
        ? (user?.user_metadata.name as string)
        : "",
      email: user?.email ?? "",
      avatar: "",
      items: [
        { title: "Account", url: "/account", icon: User2Icon },
      ],
    };

    return (
      <Sidebar
        collapsible="icon"
        {...props}
        className="dark:border-muted z-100 bg-muted-foreground"
      >
        <SidebarHeader className="mb-5 mt-2">
          <div className="flex gap-4 items-center">
            <div className="px-2">
              <SpeedySiteLogo isDark={isDark} />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <MainNav
            DashboardItems={adminNav[0] as { title: string; url: string; icon: typeof LayoutDashboardIcon; isActive: false }}
            NavItems={adminNav.slice(1)}
          />
        </SidebarContent>

        <SidebarFooter>
          <FooterNav items={adminUser} />
        </SidebarFooter>
      </Sidebar>
    );
  }

  // ─── EXPERT NAV (clean workspace) ───
  if (isExpert) {
    const expertNav = [
      { title: "My Orders", url: "/dashboard/orders", icon: Wrench, isActive: pathname === "/dashboard/orders" || pathname === "/dashboard" },
      { title: "Support Tickets", url: "/dashboard/tickets", icon: LifeBuoy, isActive: pathname === "/dashboard/tickets" },
    ];

    const expertUser = {
      name: user?.user_metadata.name
        ? (user?.user_metadata.name as string)
        : "",
      email: user?.email ?? "",
      avatar: "",
      items: [
        { title: "Account", url: "/account", icon: User2Icon },
      ],
    };

    return (
      <Sidebar
        collapsible="icon"
        {...props}
        className="dark:border-muted z-100 bg-muted-foreground"
      >
        <SidebarHeader className="mb-5 mt-2">
          <div className="flex gap-4 items-center">
            <div className="px-2">
              <SpeedySiteLogo isDark={isDark} />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <MainNav
            DashboardItems={expertNav[0] as { title: string; url: string; icon: typeof Wrench; isActive: false }}
            NavItems={expertNav.slice(1)}
          />
        </SidebarContent>

        <SidebarFooter>
          <FooterNav items={expertUser} />
        </SidebarFooter>
      </Sidebar>
    );
  }

  // ─── REGULAR USER NAV (existing full dashboard) ───
  const data = {
    user: {
      name: user?.user_metadata.name
        ? (user?.user_metadata.name as string)
        : "",
      email: user?.email ?? "",
      avatar: "",
      items: [
        { title: "Account", url: "/account", icon: User2Icon },
        { title: "Billing", url: "/account/subscription", icon: CreditCard },
      ],
    },
    navMain: [
      {
        title: "CrUX Data",
        url: `/dashboard?site=${selectedSite}`,
        icon: Activity,
        isActive: false,
      },
      {
        title: "Real User Monitoring",
        url: "#",
        icon: Activity,
        isActive: true,
        items: [
          {
            title: "Web Vitals",
            url: `/dashboard/rum/web-vitals?site=${selectedSite}`,
          },
          {
            title: "Page Groups",
            url: `/dashboard/rum/pages?site=${selectedSite}`,
          },
          { title: "Trace", url: `/dashboard/rum/trace?site=${selectedSite}` },
          { title: "Global UX", url: `/dashboard/rum/ux?site=${selectedSite}` },
          {
            title: "Analytics",
            url: `/dashboard/rum/analytics?site=${selectedSite}`,
          },
        ],
      },
      {
        title: "Enhancements",
        url: "#",
        icon: FlaskConical,
        isActive: false,
        items: [
          {
            title: "Images",
            url: `/dashboard/rum/lcp-images?site=${selectedSite}`,
          },
          { title: "Fonts", url: `/dashboard/rum/fonts?site=${selectedSite}` },
        ],
      },
      {
        title: "Managed WP Performance",
        url: "#",
        icon: CircleGauge,
        isActive: false,
        items: [
          {
            title: "Status",
            url: `/dashboard/managed-wp/status?site=${selectedSite}`,
          },
        ],
      },
      {
        title: "Support Tickets",
        url: "/dashboard/tickets",
        icon: LifeBuoy,
        isActive: false,
      },
    ],
  };

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="dark:border-muted z-100 bg-muted-foreground"
    >
      <SidebarHeader className="mb-5 mt-2">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            {selectSiteDisabled === true ? (
              <div className="px-2">
                <SpeedySiteLogo isDark={isDark} />
              </div>
            ) : (
              <SelectSite collapsed={selectSiteCollapsed} />
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <MainNav
          DashboardItems={
            data.navMain[0] as {
              title: string;
              url: string;
              icon: typeof Activity;
              isActive: false;
            }
          }
          Settings={{
            title: "Settings",
            url: `/dashboard/settings?site=${selectedSite}`,
            icon: Settings2,
            isActive: false,
          }}
          NavItems={data.navMain.slice(1)}
        />
      </SidebarContent>

      <SidebarFooter>
        <FooterNav items={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
