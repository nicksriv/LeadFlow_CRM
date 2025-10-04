import { Home, Users, MessageSquare, Settings, TrendingUp, CheckSquare, UserCog } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Leads",
    url: "/leads",
    icon: Users,
  },
  {
    title: "Conversations",
    url: "/conversations",
    icon: MessageSquare,
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Team",
    url: "/team",
    icon: UserCog,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: TrendingUp,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">LeadFlow</h2>
            <p className="text-xs text-muted-foreground">CRM Platform</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
