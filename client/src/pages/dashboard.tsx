import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Mail, Target } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { LeadScoreMeter } from "@/components/lead-score-meter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { Lead } from "@shared/schema";

export default function Dashboard() {
  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: stats } = useQuery<{
    totalLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    avgScore: number;
    totalConversations: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const hotLeads = leads?.filter((l) => l.status === "hot") || [];
  const recentLeads = leads?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your lead pipeline and performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats?.totalLeads || 0}
          icon={Users}
          description="across all statuses"
        />
        <StatCard
          title="Hot Leads"
          value={stats?.hotLeads || 0}
          icon={Target}
          description="ready to convert"
        />
        <StatCard
          title="Average Score"
          value={stats?.avgScore || 0}
          icon={TrendingUp}
          description="out of 100"
        />
        <StatCard
          title="Conversations"
          value={stats?.totalConversations || 0}
          icon={Mail}
          description="total email threads"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Hot Leads</CardTitle>
            <Button variant="ghost" size="sm" asChild data-testid="link-view-all-hot">
              <Link href="/leads?filter=hot">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {hotLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hot leads yet. Keep nurturing your pipeline!
              </div>
            ) : (
              <div className="space-y-4">
                {hotLeads.slice(0, 5).map((lead) => (
                  <Link href={`/leads/${lead.id}`} key={lead.id}>
                    <div
                      className="flex items-center justify-between p-3 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`card-hot-lead-${lead.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{lead.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {lead.company || lead.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">{lead.score}</p>
                          <p className="text-xs text-muted-foreground">score</p>
                        </div>
                        <LeadStatusBadge status={lead.status as any} size="sm" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Recent Leads</CardTitle>
            <Button variant="ghost" size="sm" asChild data-testid="link-view-all-leads">
              <Link href="/leads">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No leads yet. Start by adding your first lead!
              </div>
            ) : (
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <Link href={`/leads/${lead.id}`} key={lead.id}>
                    <div
                      className="p-3 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`card-recent-lead-${lead.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{lead.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {lead.company || lead.email}
                          </p>
                        </div>
                        <LeadStatusBadge status={lead.status as any} size="sm" />
                      </div>
                      <div className="mt-3">
                        <LeadScoreMeter
                          score={lead.score}
                          status={lead.status as any}
                          showLabel={false}
                          size="sm"
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lead Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Hot Leads</span>
                <span className="text-muted-foreground tabular-nums">
                  {stats?.hotLeads || 0}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-status-hot transition-all"
                  style={{
                    width: `${((stats?.hotLeads || 0) / (stats?.totalLeads || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Warm Leads</span>
                <span className="text-muted-foreground tabular-nums">
                  {stats?.warmLeads || 0}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-status-warm transition-all"
                  style={{
                    width: `${((stats?.warmLeads || 0) / (stats?.totalLeads || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Cold Leads</span>
                <span className="text-muted-foreground tabular-nums">
                  {stats?.coldLeads || 0}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-status-cold transition-all"
                  style={{
                    width: `${((stats?.coldLeads || 0) / (stats?.totalLeads || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
