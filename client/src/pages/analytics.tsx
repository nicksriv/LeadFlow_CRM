import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Target, Mail } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import type { Lead } from "@shared/schema";

export default function Analytics() {
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

  const conversionRate = stats?.totalLeads
    ? ((stats.hotLeads / stats.totalLeads) * 100).toFixed(1)
    : "0.0";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Insights and metrics for your lead pipeline
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats?.totalLeads || 0}
          icon={Users}
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={Target}
        />
        <StatCard
          title="Average Score"
          value={stats?.avgScore || 0}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Conversations"
          value={stats?.totalConversations || 0}
          icon={Mail}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Breakdown</CardTitle>
            <CardDescription>Distribution of leads by temperature</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-status-hot" />
                  <span className="text-sm font-medium">Hot Leads</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {((stats?.hotLeads || 0) / (stats?.totalLeads || 1) * 100).toFixed(0)}%
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {stats?.hotLeads || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-status-warm" />
                  <span className="text-sm font-medium">Warm Leads</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {((stats?.warmLeads || 0) / (stats?.totalLeads || 1) * 100).toFixed(0)}%
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {stats?.warmLeads || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-status-cold" />
                  <span className="text-sm font-medium">Cold Leads</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {((stats?.coldLeads || 0) / (stats?.totalLeads || 1) * 100).toFixed(0)}%
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {stats?.coldLeads || 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>Lead scores across your pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>High Performers (67-100)</span>
                  <span className="font-semibold tabular-nums">
                    {leads?.filter((l) => l.score >= 67).length || 0}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-status-hot"
                    style={{
                      width: `${((leads?.filter((l) => l.score >= 67).length || 0) / (leads?.length || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Mid Range (34-66)</span>
                  <span className="font-semibold tabular-nums">
                    {leads?.filter((l) => l.score >= 34 && l.score < 67).length || 0}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-status-warm"
                    style={{
                      width: `${((leads?.filter((l) => l.score >= 34 && l.score < 67).length || 0) / (leads?.length || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Low Engagement (0-33)</span>
                  <span className="font-semibold tabular-nums">
                    {leads?.filter((l) => l.score < 34).length || 0}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-status-cold"
                    style={{
                      width: `${((leads?.filter((l) => l.score < 34).length || 0) / (leads?.length || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
