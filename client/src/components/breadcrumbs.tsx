import { Home } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

export function Breadcrumbs() {
  const [location] = useLocation();
  
  const getBreadcrumbs = (): BreadcrumbSegment[] => {
    const paths = location.split("/").filter(Boolean);
    
    // Always start with home
    const breadcrumbs: BreadcrumbSegment[] = [
      { label: "Dashboard", href: "/" }
    ];

    // Map routes to breadcrumb labels
    const routeMap: Record<string, string> = {
      leads: "Leads",
      conversations: "Conversations",
      pipeline: "Pipeline",
      tasks: "Tasks",
      team: "Team",
      automation: "Automation",
      analytics: "Analytics",
      settings: "Settings",
      advanced: "Advanced Settings",
    };

    let currentPath = "";
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      
      // Check if it's a UUID (lead detail page)
      if (path.match(/^[a-f0-9-]{36}$/i)) {
        breadcrumbs.push({ label: "Lead Details" });
      } else {
        const label = routeMap[path] || path.charAt(0).toUpperCase() + path.slice(1);
        breadcrumbs.push({ 
          label, 
          href: index === paths.length - 1 ? undefined : currentPath 
        });
      }
    });

    // Don't show breadcrumbs on home page
    if (location === "/") {
      return [];
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb data-testid="breadcrumbs">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="contents">
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.href ? (
                <BreadcrumbLink asChild>
                  <Link 
                    href={crumb.href}
                    data-testid={`breadcrumb-${crumb.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {index === 0 && <Home className="h-4 w-4" />}
                    {index > 0 && crumb.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage data-testid={`breadcrumb-${crumb.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  {crumb.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
