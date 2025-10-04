import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import LeadDetail from "@/pages/lead-detail";
import Conversations from "@/pages/conversations";
import Tasks from "@/pages/tasks";
import Team from "@/pages/team";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import SettingsAdvanced from "@/pages/settings-advanced";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/leads" component={Leads} />
      <Route path="/leads/:id" component={LeadDetail} />
      <Route path="/conversations" component={Conversations} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/team" component={Team} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route path="/settings/advanced" component={SettingsAdvanced} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between px-6 py-3 border-b">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto p-6">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
