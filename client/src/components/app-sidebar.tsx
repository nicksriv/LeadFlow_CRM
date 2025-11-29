import { Home, Users, MessageSquare, Settings, TrendingUp, CheckSquare, UserCog, ChevronUp, LogOut, User as UserIcon, Kanban, Zap, BarChart3, Linkedin } from "lucide-react";
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
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

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
    title: "Pipeline",
    url: "/pipeline",
    icon: Kanban,
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
    title: "Automation",
    url: "/automation",
    icon: Zap,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "LinkedIn Outreach",
    url: "/linkedin-outreach",
    icon: Linkedin,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  // Fetch first admin user as demo current user
  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const currentUser = users?.find((u) => u.role === "admin") || users?.[0];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeConfig = (role: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      admin: {
        label: "Admin",
        className: "bg-primary/10 text-primary border-primary/20"
      },
      sales_manager: {
        label: "Manager",
        className: "bg-info/10 text-info border-info/20"
      },
      sales_rep: {
        label: "Sales Rep",
        className: "bg-success/10 text-success border-success/20"
      },
    };
    return variants[role] || variants.sales_rep;
  };

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
      {currentUser && (
        <SidebarFooter className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 w-full p-2 rounded-md hover-elevate active-elevate-2 transition-colors"
                data-testid="button-user-menu"
              >
                <Avatar className="h-8 w-8 bg-gradient-to-br from-primary to-info">
                  <AvatarFallback className="bg-transparent text-primary-foreground text-sm">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-10 w-10 bg-gradient-to-br from-primary to-info">
                  <AvatarFallback className="bg-transparent text-primary-foreground">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentUser.name}</p>
                  <Badge
                    variant="outline"
                    className={`mt-1 ${getRoleBadgeConfig(currentUser.role).className}`}
                  >
                    {getRoleBadgeConfig(currentUser.role).label}
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="menu-profile">
                <UserIcon className="h-4 w-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="menu-preferences">
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" data-testid="menu-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
