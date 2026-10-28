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
  const { selectedSite, role } = useSiteContext(); // roleLoading removed - we render instantly from cache
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const user = useSupabaseUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const sidebarOpen =
    state === "expanded" ? false : state === "collapsed" ? true : null;

  const selectSiteCollapsed = isMobile ? false : (sidebarOpen ?? false);
  const selectSiteDisabled = pathname.includes("/account");

  const isAdmin = role === "admin";
  const isExpert = role === "expert";

  // ─── ADMIN-ONLY NAV (clean, no site selector, no other sections) ───
  if (isAdmin) {
    const adminNav = [
      { title: "Orders", url: "/dashboard/admin/orders", icon: ClipboardList, isActive: false as const },
      { title: "Experts", url: "/dashboard/admin/experts", icon: UserCog, isActive: false as const },
      { title: "Unassigned Queue", url: "/dashboard/admin/queue", icon: ListTodo, isActive: false as const },
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
            DashboardItems={adminNav[0]}
            Settings={{ title: "Admin", url: "#", icon: Settings2, isActive: false }}
            NavItems={adminNav.slice(1)}
          />
        </SidebarContent>
        <SidebarFooter>
          <FooterNav items={adminUser} />
        </SidebarFooter>
      </Sidebar>
    );
  }

  // ─── EXPERT NAV ───
  const expertNav = isExpert
    ? [
        {
          title: "Expert Tools",
          url: "#",
          icon: Wrench,
          isActive: true,
          items: [
            { title: "Assigned Orders", url: "/dashboard/expert/orders" },
          ],
        },
      ]
    : [];

  // ─── REGULAR USER NAV (existing full dashboard) ───
  const data = {
    user: {
      name: user?.user_metadata.name
        ? (user?.user_metadata.name as string)
        : "",
      email: user?.email ?? "",
      avatar: "",
      items: [
        { title: "Pricing & Upgrade", url: "/dashboard/pricing", icon: CreditCard },
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
      ...expertNav,
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