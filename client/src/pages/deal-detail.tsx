import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, DollarSign, Calendar, User, TrendingUp, History, MessageSquare, CheckCircle2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Deal, Activity, User as UserType, PipelineStage } from "@shared/schema";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDealSchema, type InsertDeal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const activityIcons = {
  email: MessageSquare,
  call: MessageSquare,
  meeting: MessageSquare,
  note: MessageSquare,
  stage_change: TrendingUp,
  task_completed: CheckCircle2,
  created: History,
} as const;

function EditDealDialog({ deal, stages, users, open, onOpenChange }: {
  deal: Deal;
  stages: PipelineStage[];
  users: UserType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  
  const form = useForm<InsertDeal>({
    resolver: zodResolver(insertDealSchema),
    defaultValues: {
      name: deal.name,
      pipelineId: deal.pipelineId,
      stageId: deal.stageId,
      amount: deal.amount,
      probability: deal.probability || 0,
      expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate) : undefined,
      ownerId: deal.ownerId,
      leadId: deal.leadId || undefined,
      description: deal.description || "",
      status: deal.status,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertDeal) => {
      return apiRequest("PATCH", `/api/deals/${deal.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({
        title: "Deal updated",
        description: "The deal has been successfully updated",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update deal",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-deal-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-deal-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probability (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-deal-probability"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-deal-stage">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-deal-owner">
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expectedCloseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Close Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      data-testid="input-deal-close-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} rows={3} data-testid="input-deal-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-deal-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-deal">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DealDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [editOpen, setEditOpen] = useState(false);

  const { data: deal, isLoading: dealLoading } = useQuery<Deal>({
    queryKey: ["/api/deals", id],
    enabled: !!id,
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: [`/api/activities?dealId=${id}`],
    enabled: !!id,
  });

  const { data: stages = [] } = useQuery<PipelineStage[]>({
    queryKey: [`/api/pipelines/${deal?.pipelineId}/stages`],
    enabled: !!deal?.pipelineId,
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const currentStage = stages.find((s) => s.id === deal?.stageId);
  const owner = users.find((u) => u.id === deal?.ownerId);

  if (dealLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading deal...</div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Deal not found</h2>
          <Button onClick={() => navigate("/pipeline")} data-testid="button-back-to-pipeline">
            Back to Pipeline
          </Button>
        </div>
      </div>
    );
  }

  const weightedValue = (deal.amount * (deal.probability || 0)) / 100;
  const stageActivities = activities.filter((a) => a.type === "stage_change");

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/pipeline")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-deal-name">{deal.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {currentStage && (
                  <Badge variant="secondary" data-testid="badge-deal-stage">
                    {currentStage.name}
                  </Badge>
                )}
                <Badge variant={deal.status === "won" ? "default" : deal.status === "lost" ? "destructive" : "outline"} data-testid="badge-deal-status">
                  {deal.status}
                </Badge>
              </div>
            </div>
          </div>
          <Button onClick={() => setEditOpen(true)} data-testid="button-edit-deal">
            <Edit className="h-4 w-4 mr-2" />
            Edit Deal
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deal Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Amount</div>
                      <div className="text-2xl font-bold" data-testid="text-deal-amount">
                        ${deal.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Weighted: ${Math.round(weightedValue).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Probability</div>
                      <div className="text-2xl font-bold" data-testid="text-deal-probability">
                        {deal.probability || 0}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Expected Close</div>
                      <div className="font-semibold" data-testid="text-deal-close-date">
                        {deal.expectedCloseDate
                          ? format(new Date(deal.expectedCloseDate), "MMM dd, yyyy")
                          : "Not set"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <User className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Owner</div>
                      <div className="font-semibold" data-testid="text-deal-owner">
                        {owner?.name || "Unassigned"}
                      </div>
                    </div>
                  </div>
                </div>

                {deal.description && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium mb-2">Description</div>
                      <div className="text-sm text-muted-foreground" data-testid="text-deal-description">
                        {deal.description}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading activities...
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-activities">
                    No activities yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => {
                      const Icon = activityIcons[activity.type as keyof typeof activityIcons] || MessageSquare;
                      return (
                        <div key={activity.id} className="flex gap-3" data-testid={`activity-${activity.id}`}>
                          <div className="p-2 bg-muted rounded-lg h-fit">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="font-medium">{activity.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(activity.createdAt), "MMM dd, h:mm a")}
                              </div>
                            </div>
                            {activity.metadata && (
                              <pre className="text-xs text-muted-foreground mt-1 font-mono">
                                {String(JSON.stringify(activity.metadata, null, 2))}
                              </pre>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stage History</CardTitle>
              </CardHeader>
              <CardContent>
                {stageActivities.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm" data-testid="empty-stage-history">
                    No stage changes yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stageActivities.map((activity, index) => (
                      <div key={activity.id} className="flex items-start gap-3" data-testid={`stage-history-${activity.id}`}>
                        <div className="flex flex-col items-center">
                          <div className="p-1.5 bg-primary/10 rounded-full">
                            <TrendingUp className="h-3 w-3 text-primary" />
                          </div>
                          {index < stageActivities.length - 1 && (
                            <div className="w-px h-8 bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="text-sm font-medium">{activity.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(activity.createdAt), "MMM dd, h:mm a")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <EditDealDialog
        deal={deal}
        stages={stages}
        users={users}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
