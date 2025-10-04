import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Edit, Trash2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { LeadScoreMeter } from "@/components/lead-score-meter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { Lead, Conversation, Activity, Task } from "@shared/schema";
import { useState } from "react";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { EmailComposerDialog } from "@/components/email-composer-dialog";
import { TaskDialog } from "@/components/task-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function LeadDetail() {
  const [, params] = useRoute("/leads/:id");
  const leadId = params?.id;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { toast } = useToast();

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId,
  });

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/leads", leadId, "conversations"],
    enabled: !!leadId,
  });

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/leads", leadId, "activities"],
    enabled: !!leadId,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/leads", leadId, "tasks"],
    enabled: !!leadId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/leads/${leadId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead deleted",
        description: "The lead has been removed from your pipeline.",
      });
      window.location.href = "/leads";
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading lead details...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-muted-foreground">Lead not found</div>
        <Button asChild>
          <Link href="/leads">Back to Leads</Link>
        </Button>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/leads">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-lead-name">
            {lead.name}
          </h1>
          <p className="text-muted-foreground">{lead.company}</p>
        </div>
        <div className="flex items-center gap-2">
          <EmailComposerDialog
            leadId={lead.id}
            leadEmail={lead.email}
            leadName={lead.name}
          />
          <TaskDialog leadId={lead.id} />
          <Button
            variant="outline"
            onClick={() => setIsEditOpen(true)}
            data-testid="button-edit-lead"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsDeleteOpen(true)}
            data-testid="button-delete-lead"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center py-6">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl">
                    {getInitials(lead.name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-primary hover:underline"
                    data-testid="link-email"
                  >
                    {lead.email}
                  </a>
                </div>

                {lead.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-primary hover:underline"
                    >
                      {lead.phone}
                    </a>
                  </div>
                )}

                {lead.company && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.company}</span>
                  </div>
                )}

                {lead.position && (
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.position}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LeadStatusBadge status={lead.status as any} />
              <LeadScoreMeter score={lead.score} status={lead.status as any} />
              {lead.lastContactedAt && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Last contacted{" "}
                    {formatDistanceToNow(new Date(lead.lastContactedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {lead.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}

          {lead.tags && lead.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="conversations" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="conversations" data-testid="tab-conversations">
                Conversations ({conversations?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="tasks" data-testid="tab-tasks">
                Tasks ({tasks?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">
                Activity ({activities?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conversations" className="space-y-4 mt-6">
              {conversations?.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center text-muted-foreground">
                    No conversations yet. Email exchanges will appear here once synced.
                  </div>
                </Card>
              ) : (
                conversations?.map((conv) => (
                  <Card key={conv.id} data-testid={`card-conversation-${conv.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">
                            {conv.subject}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={conv.isFromLead ? "default" : "secondary"}>
                              {conv.isFromLead ? "Received" : "Sent"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conv.sentAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap line-clamp-4">
                        {conv.body}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4 mt-6">
              {tasks?.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center text-muted-foreground">
                    No tasks yet. Create a task to track follow-ups and reminders.
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {tasks?.map((task) => (
                    <Card key={task.id} data-testid={`card-task-${task.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="pt-0.5">
                            {task.status === "completed" ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-medium">{task.title}</h3>
                              <Badge
                                variant={
                                  task.priority === "urgent"
                                    ? "destructive"
                                    : task.priority === "high"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {task.priority}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {task.dueDate && (
                                <span>
                                  Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                                </span>
                              )}
                              <span>•</span>
                              <span className="capitalize">{task.status}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-4 mt-6">
              {activities?.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center text-muted-foreground">
                    No activity yet. Actions will be logged here automatically.
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {activities?.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-4"
                      data-testid={`activity-${activity.id}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1 pb-4 border-b last:border-0">
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <LeadFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        lead={lead}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
              All associated conversations and activities will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
