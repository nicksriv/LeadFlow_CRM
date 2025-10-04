import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AutomationRule, InsertAutomationRule } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Trash2, Eye, Settings, Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function AutomationPage() {
  const { toast } = useToast();
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/automation-rules"],
  });

  const { data: logs = [] } = useQuery<any[]>({
    queryKey: ["/api/automation-logs"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: number }) => {
      return apiRequest("PATCH", `/api/automation-rules/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      toast({
        title: "Rule updated",
        description: "Automation rule status has been updated.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/automation-rules/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      toast({
        title: "Rule deleted",
        description: "Automation rule has been deleted.",
      });
      setDeleteRuleId(null);
    },
  });

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case "score_changed":
        return <Sparkles className="h-4 w-4" />;
      case "conversation_received":
        return <Zap className="h-4 w-4" />;
      case "deal_stage_change":
        return <ArrowRight className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getTriggerLabel = (type: string) => {
    switch (type) {
      case "score_changed":
        return "Score Changed";
      case "conversation_received":
        return "Email Received";
      case "deal_stage_change":
        return "Stage Changed";
      default:
        return type;
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case "convert_to_deal":
        return "Create Deal";
      case "create_task":
        return "Create Task";
      case "advance_stage":
        return "Advance Stage";
      case "assign_lead":
        return "Assign Lead";
      case "send_email":
        return "Send Email";
      default:
        return type;
    }
  };

  const recentLogs = logs.slice(0, 10);
  const successRate = logs.length > 0
    ? Math.round((logs.filter((l: any) => l.success === 1).length / logs.length) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading automation rules...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              Workflow Automation
            </h1>
            <p className="text-muted-foreground mt-1">
              Automate repetitive tasks and streamline your sales process
            </p>
          </div>
          <Button data-testid="button-create-rule" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
              <Zap className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rules.filter((r) => r.isActive === 1).length}</div>
              <p className="text-xs text-muted-foreground">
                {rules.length} total rules
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Executions</CardTitle>
              <Sparkles className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-xs text-muted-foreground">
                {successRate}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
              <ArrowRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logs.filter((l: any) => {
                  const logTime = new Date(l.executedAt).getTime();
                  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
                  return logTime > dayAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                executions today
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Automation Rules</CardTitle>
            <CardDescription>
              Configure triggers and actions to automate your workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No automation rules configured yet.
                </div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`rule-${rule.id}`}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg">
                        {getTriggerIcon(rule.triggerType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{rule.name}</h3>
                          {rule.isActive === 1 && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {rule.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary">
                            {getTriggerLabel(rule.triggerType)}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="secondary">
                            {getActionLabel(rule.actionType)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRule(rule)}
                            data-testid={`button-view-rule-${rule.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{rule.name}</DialogTitle>
                            <DialogDescription>{rule.description}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Trigger</h4>
                              <div className="p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge>{getTriggerLabel(rule.triggerType)}</Badge>
                                </div>
                                <pre className="text-xs overflow-auto">
                                  {JSON.stringify(rule.triggerConditions, null, 2)}
                                </pre>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Action</h4>
                              <div className="p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge>{getActionLabel(rule.actionType)}</Badge>
                                </div>
                                <pre className="text-xs overflow-auto">
                                  {JSON.stringify(rule.actionConfig, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Switch
                        checked={rule.isActive === 1}
                        onCheckedChange={(checked) => {
                          toggleMutation.mutate({
                            id: rule.id,
                            isActive: checked ? 1 : 0,
                          });
                        }}
                        data-testid={`switch-toggle-rule-${rule.id}`}
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteRuleId(rule.id)}
                        data-testid={`button-delete-rule-${rule.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>
                Latest automation rule executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentLogs.map((log: any, i: number) => {
                  const rule = rules.find((r) => r.id === log.ruleId);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-lg text-sm"
                      data-testid={`log-${i}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${log.success === 1 ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="font-medium">{rule?.name || "Unknown Rule"}</span>
                        {log.success === 0 && (
                          <span className="text-destructive text-xs">
                            {log.errorMessage}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {new Date(log.executedAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={deleteRuleId !== null} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRuleId && deleteMutation.mutate(deleteRuleId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
