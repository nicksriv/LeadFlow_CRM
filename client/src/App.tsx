import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { QuickActions } from "@/components/quick-actions";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import LeadDetail from "@/pages/lead-detail";
import Conversations from "@/pages/conversations";
import Pipeline from "@/pages/pipeline";
import DealDetail from "@/pages/deal-detail";
import Tasks from "@/pages/tasks";
import Team from "@/pages/team";
import Automation from "@/pages/automation";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import SettingsAdvanced from "@/pages/settings-advanced";
import LinkedInOutreach from "@/pages/linkedin-outreach";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

function Router() {
  return (
    <Switch>
      {/* Public routes - no sidebar */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Protected routes - with sidebar and header */}
      <Route path="/">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/leads">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <Leads />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/leads/:id">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <LeadDetail />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/conversations">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <Conversations />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/pipeline">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <Pipeline />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/deals/:id">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <DealDetail />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/tasks">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <Tasks />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/team">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <Team />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/automation">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <Automation />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/analytics">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <Analytics />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/linkedin-outreach">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <LinkedInOutreach />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/settings/advanced">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <SettingsAdvanced />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
    "--sidebar-width-mobile": "18rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden md:block">
                <Breadcrumbs />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <QuickActions />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
