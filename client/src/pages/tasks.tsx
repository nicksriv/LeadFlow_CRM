import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, ListTodo } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import type { Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Tasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, completedAt: status === "completed" ? new Date() : null }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to update task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "Task status has been changed",
      });
    },
  });

  const pendingTasks = tasks?.filter((t) => t.status === "pending" || t.status === "in_progress") || [];
  const completedTasks = tasks?.filter((t) => t.status === "completed") || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground mt-1">
          Manage follow-ups and reminders across all leads
        </p>
      </div>

      {tasks?.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <ListTodo className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">No tasks yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create tasks from lead detail pages to track follow-ups
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Active Tasks ({pendingTasks.length})</h2>
              {pendingTasks.map((task) => (
                <Card key={task.id} data-testid={`card-task-${task.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium">{task.title}</h3>
                            <Link href={`/leads/${task.leadId}`}>
                              <span className="text-sm text-primary hover:underline">
                                View Lead →
                              </span>
                            </Link>
                          </div>
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
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {task.dueDate && (
                              <span>
                                Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateTaskMutation.mutate({ id: task.id, status: "completed" })
                            }
                            disabled={updateTaskMutation.isPending}
                            data-testid={`button-complete-task-${task.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark Complete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                Completed Tasks ({completedTasks.length})
              </h2>
              {completedTasks.map((task) => (
                <Card key={task.id} data-testid={`card-task-${task.id}`} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium line-through">{task.title}</h3>
                            <Link href={`/leads/${task.leadId}`}>
                              <span className="text-sm text-primary hover:underline">
                                View Lead →
                              </span>
                            </Link>
                          </div>
                          <Badge variant="secondary">Completed</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
