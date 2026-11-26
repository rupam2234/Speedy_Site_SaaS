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
  Lock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  useSidebar,
} from "../ui/sidebar";
import MainNav from "./Main-Nav";
import FooterNav from "./Footer-Nav";
import { SelectSite } from "../utils/siteSelector";
import { CustomTooltip } from "../theme";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "../theme/ThemeProvider";
import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import { useIsMobile } from "@/components/theme/use-mobile";
import { SidebarBrand } from "./SidebarBrand";

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const { selectedSite, orders, role } = useSiteContext(); // roleLoading removed - we render instantly from cache
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const user = useSupabaseUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const sidebarOpen =
    state === "expanded" ? false : state === "collapsed" ? true : null;

  const selectSiteCollapsed = isMobile ? false : (sidebarOpen ?? false);
  const selectSiteDisabled = pathname.includes("/account");

  const selectedFavicon = orders?.find(
    (o) => o.website_name === selectedSite,
  )?.favicon_file;

  // Per-site payment gate. Orders are created unpaid while a site is being
  // connected (order_status = false) and flip to true when payment completes,
  // so the paid sections are shown but locked until then. CrUX data is public
  // Google data and stays available for any connected site.
  const selectedOrder = orders?.find((o) => o.website_name === selectedSite);
  const isSelectedSitePaid = selectedOrder?.order_status === true;

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
          <div className="flex items-center">
            <SidebarBrand isDark={isDark} collapsed={selectSiteCollapsed} />
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
          <div className="flex items-center">
            <SidebarBrand isDark={isDark} collapsed={selectSiteCollapsed} />
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

  // ─── CONFIGURATION ISOLATION (service setup) ───
  // While a site is being configured on /dashboard/onboarding the surrounding
  // chrome drops the site switcher and every site-scoped nav link. Setup is
  // per-site, so letting the user switch sites (or open another site's data)
  // here is what made the tour's progress and the page's status disagree. The
  // flow stays pointed at exactly one site until it is finished.
  const isConfigRoute = pathname?.startsWith("/dashboard/onboarding");
  if (isConfigRoute) {
    const isAddingNewSite = searchParams.get("intent") === "new-site";
    const configuredSite = searchParams.get("site") ?? selectedSite;
    // A brand new site has no stored favicon yet, so the mark takes over.
    const setupSite = isAddingNewSite ? undefined : configuredSite;

    const setupLabel = isAddingNewSite
      ? "Adding a new site"
      : configuredSite
        ? `Configuring ${configuredSite}`
        : "Service setup";

    return (
      <Sidebar
        collapsible="icon"
        {...props}
        className="dark:border-muted z-100 bg-muted-foreground"
      >
        <SidebarHeader className="mb-5 mt-2">
          <div className="flex items-center">
            <SidebarBrand
              isDark={isDark}
              collapsed={selectSiteCollapsed}
              favicon={setupSite ? selectedFavicon : undefined}
              site={setupSite || undefined}
            />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Service setup</SidebarGroupLabel>
            <div className="flex flex-col gap-3 px-2 py-2">
              {/* Locked site chip: context for the flow, but not switchable. */}
              {selectSiteCollapsed ? (
                <div className="flex justify-center">
                  <CustomTooltip
                    content={setupLabel}
                    side="right"
                    trigger={
                      <div className="flex size-8 items-center justify-center rounded-sm border border-primary/20 bg-primary/5">
                        <Lock className="size-3.5 shrink-0 text-primary/60" />
                      </div>
                    }
                  />
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/5 px-2.5 py-2"
                  title="Site switching is paused during setup"
                >
                  <Lock className="size-3.5 shrink-0 text-primary/60" />
                  <span className="truncate text-xs font-medium text-primary/80">
                    {setupLabel}
                  </span>
                </div>
              )}
              {!selectSiteCollapsed && (
                <p className="text-[11px] leading-relaxed text-primary/60">
                  Finish connecting this site to unlock the rest of the
                  dashboard. Site switching is paused while you configure.
                </p>
              )}
            </div>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <FooterNav
            items={{
              name: user?.user_metadata.name
                ? (user?.user_metadata.name as string)
                : "",
              email: user?.email ?? "",
              avatar: "",
              items: [
                {
                  title: "Support Tickets",
                  url: "/dashboard/tickets",
                  icon: LifeBuoy,
                },
              ],
            }}
          />
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
        {
          title: "Settings",
          url: `/dashboard/settings?site=${selectedSite}`,
          icon: Settings2,
        },
        { title: "Support Tickets", url: "/dashboard/tickets", icon: LifeBuoy },
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
        // Locked until this site's payment completes (the pages themselves
        // show the upgrade fallback). CrUX stays open either way.
        locked: !isSelectedSitePaid,
        items: [
          {
            title: "Web Vitals",
            url: `/dashboard/rum/web-vitals?site=${selectedSite}`,
          },
          {
            title: "Page Groups",
            url: `/dashboard/rum/pages?site=${selectedSite}`,
          },
          {
            title: "Performance Assistant",
            url: `/dashboard/rum/assistant?site=${selectedSite}`,
          },
        ],
      },
      {
        title: "Enhancements",
        url: "#",
        icon: FlaskConical,
        isActive: false,
        locked: !isSelectedSitePaid,
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
            title: "Expert Chat",
            url: `/dashboard/managed-wp/status?site=${selectedSite}`,
          },
          {
            title: "Setup Status",
            url: `/dashboard/onboarding?site=${selectedSite}`,
          },
        ],
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
              <SidebarBrand
                isDark={isDark}
                collapsed={selectSiteCollapsed}
                favicon={selectedFavicon}
                site={selectedSite}
              />
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

          NavItems={data.navMain.slice(1)}
        />
      </SidebarContent>

      <SidebarFooter>
        <FooterNav items={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}