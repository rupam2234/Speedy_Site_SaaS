"use client";

import { ChevronRight, Lock, LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "../ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LayoutDashboardIcon } from "lucide-react";

export default function MainNav({
  NavItems,
  DashboardItems,
}: {
  NavItems: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive: boolean;
    /** Renders a lock marker: the entry exists but is gated for this site. */
    locked?: boolean;
    items?: { title: string; url: string }[];
  }[];

  DashboardItems: {
    title: string;
    url: string;
    icon: typeof LayoutDashboardIcon;
    isActive: false;
  };


}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        <Collapsible className="mb-2">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <a href={DashboardItems.url} title={DashboardItems.title}>
                <SidebarMenuButton tooltip={DashboardItems.title}>
                  {DashboardItems.icon && <DashboardItems.icon />}
                  {DashboardItems.title}
                </SidebarMenuButton>
              </a>
            </CollapsibleTrigger>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>

      <SidebarMenu>
        {NavItems.map((items) => (
          items.items && items.items.length > 0 ? (
            <Collapsible
              key={items.title}
              asChild
              defaultOpen={items.isActive}
              className="group/collapsible"
              title={items.title}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={
                      items.locked
                        ? `${items.title} (locked until this site's payment is complete)`
                        : items.title
                    }
                  >
                    {items.icon && <items.icon />}
                    <span>{items.title}</span>
                    {items.locked && (
                      <Lock className="ml-auto size-3 text-primary/40" />
                    )}
                    <ChevronRight
                      className={
                        items.locked
                          ? "ml-1 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                          : "ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                      }
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {items.items?.map((subItems) => (
                      <SidebarMenuSubItem key={subItems.title}>
                        <SidebarMenuSubButton asChild>
                          <a href={subItems.url}>{subItems.title}</a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={items.title}>
              <SidebarMenuButton
                asChild
                tooltip={
                  items.locked
                    ? `${items.title} (locked until this site's payment is complete)`
                    : items.title
                }
              >
                <a href={items.url}>
                  {items.icon && <items.icon />}
                  <span>{items.title}</span>
                  {items.locked && (
                    <Lock className="ml-auto size-3 text-primary/40" />
                  )}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        ))}
      </SidebarMenu>


    </SidebarGroup>
  );
}
