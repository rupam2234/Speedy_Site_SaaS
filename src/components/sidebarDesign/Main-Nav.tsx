import { ChevronRight, LucideIcon } from "lucide-react";
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
    items?: {
      title: string;
      url: string;
    }[];
  }[];

  DashboardItems: {
    title: "Dashboard";
    url: "/dashboard";
    icon: typeof LayoutDashboardIcon;
    isActive: false;
  };
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
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
          <Collapsible
            key={items.title}
            asChild
            defaultOpen={items.isActive}
            className="group/collapsible"
            title={items.title}
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={items.title}>
                  {items.icon && <items.icon />}
                  <span>{items.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
