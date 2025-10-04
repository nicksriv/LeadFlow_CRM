import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, Link2, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SyncState } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();

  const { data: syncState } = useQuery<SyncState>({
    queryKey: ["/api/sync-state"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/sync/manual", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync-state"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Sync initiated",
        description: "Email synchronization has been started.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isConfigured = syncState?.isConfigured === 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your CRM configuration and integrations
        </p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  MS 365 Integration
                </CardTitle>
                <CardDescription className="mt-1">
                  Connect your Microsoft 365 mailbox to sync conversations
                </CardDescription>
              </div>
              {isConfigured && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <h4 className="font-medium mb-2">Integration Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Connection</span>
                  <Badge variant={isConfigured ? "default" : "secondary"}>
                    {isConfigured ? "Active" : "Not configured"}
                  </Badge>
                </div>
                {syncState?.lastSyncAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last synced</span>
                    <span>
                      {new Date(syncState.lastSyncAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                MS 365 integration requires OAuth authentication with Microsoft Graph API.
                This enables automatic syncing of email conversations with your leads.
              </p>

              <div className="flex gap-3">
                {!isConfigured ? (
                  <Button data-testid="button-configure-ms365">
                    <Link2 className="h-4 w-4 mr-2" />
                    Configure MS 365
                  </Button>
                ) : (
                  <Button
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    data-testid="button-sync-now"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {syncMutation.isPending ? "Syncing..." : "Sync Now"}
                  </Button>
                )}
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-sm mb-1 text-blue-900 dark:text-blue-100">
                  Setup Instructions
                </h4>
                <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Register an app in Azure AD</li>
                  <li>Configure Microsoft Graph API permissions (Mail.Read)</li>
                  <li>Add OAuth redirect URL to your app registration</li>
                  <li>Configure your Client ID and Client Secret</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Lead Scoring</CardTitle>
            <CardDescription>
              Configuration for AI-powered conversation analysis and lead scoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <h4 className="font-medium mb-2">Scoring Algorithm</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  The AI analyzes email conversations to determine lead quality based on:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Sentiment and tone of communication</li>
                  <li>Engagement level and response frequency</li>
                  <li>Intent signals and buying indicators</li>
                  <li>Conversation context and relevance</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-md bg-status-cold/10 border border-status-cold/20">
                <div className="text-2xl font-bold text-status-cold">0-33</div>
                <div className="text-xs text-muted-foreground mt-1">Cold Leads</div>
              </div>
              <div className="p-3 rounded-md bg-status-warm/10 border border-status-warm/20">
                <div className="text-2xl font-bold text-status-warm">34-66</div>
                <div className="text-xs text-muted-foreground mt-1">Warm Leads</div>
              </div>
              <div className="p-3 rounded-md bg-status-hot/10 border border-status-hot/20">
                <div className="text-2xl font-bold text-status-hot">67-100</div>
                <div className="text-xs text-muted-foreground mt-1">Hot Leads</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
