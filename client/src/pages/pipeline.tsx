import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, Calendar, User, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Deal, Pipeline as PipelineType, PipelineStage, User as UserType, InsertDeal } from "@shared/schema";
import { insertDealSchema } from "@shared/schema";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

function DealCard({ deal, stage }: { deal: Deal; stage: PipelineStage }) {
  const [, navigate] = useLocation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const amountColor = deal.amount >= 100000 ? "text-success" : deal.amount >= 50000 ? "text-info" : "text-muted-foreground";

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      navigate(`/deals/${deal.id}`);
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card 
        className="cursor-move hover-elevate active-elevate-2" 
        data-testid={`card-deal-${deal.id}`}
        onClick={handleClick}
      >
        <CardHeader className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight" data-testid={`text-deal-name-${deal.id}`}>{deal.name}</h3>
            <Badge variant="secondary" className="shrink-0" data-testid={`badge-probability-${deal.id}`}>
              {deal.probability}%
            </Badge>
          </div>
          <div className={`flex items-center gap-1 text-sm font-semibold ${amountColor}`}>
            <DollarSign className="h-4 w-4" />
            <span data-testid={`text-amount-${deal.id}`}>{deal.amount.toLocaleString()}</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {deal.expectedCloseDate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span data-testid={`text-close-date-${deal.id}`}>
                {new Date(deal.expectedCloseDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {deal.description && (
            <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-description-${deal.id}`}>
              {deal.description}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StageColumn({ stage, deals, pipeline }: { stage: PipelineStage; deals: Deal[]; pipeline: PipelineType }) {
  const stageDeals = deals.filter(d => d.stageId === stage.id);
  const totalValue = stageDeals.reduce((sum, deal) => sum + deal.amount, 0);
  const weightedValue = stageDeals.reduce((sum, deal) => sum + (deal.amount * (deal.probability || 0) / 100), 0);

  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div className="flex flex-col min-w-[320px] max-w-[320px]" data-testid={`column-stage-${stage.id}`}>
      <div className="flex flex-col gap-1 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color || "#6B7280" }}
              data-testid={`indicator-stage-color-${stage.id}`}
            />
            <h3 className="font-semibold text-sm" data-testid={`text-stage-name-${stage.id}`}>{stage.name}</h3>
            <Badge variant="secondary" data-testid={`badge-deal-count-${stage.id}`}>{stageDeals.length}</Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-x-3">
          <span data-testid={`text-total-value-${stage.id}`}>${totalValue.toLocaleString()} total</span>
          <span data-testid={`text-weighted-value-${stage.id}`}>${Math.round(weightedValue).toLocaleString()} weighted</span>
        </div>
      </div>

      <SortableContext items={stageDeals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div 
          ref={setNodeRef}
          className={`flex flex-col gap-3 p-3 bg-muted/30 rounded-lg min-h-[200px] transition-colors ${
            isOver ? "bg-muted/50 ring-2 ring-primary/20" : ""
          }`}
        >
          {stageDeals.map(deal => (
            <DealCard key={deal.id} deal={deal} stage={stage} />
          ))}
          {stageDeals.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground" data-testid={`empty-stage-${stage.id}`}>
              {isOver ? "Drop deal here" : "No deals in this stage"}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function Pipeline() {
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: pipelines = [] } = useQuery<PipelineType[]>({
    queryKey: ["/api/pipelines"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  // Set default pipeline when pipelines load
  const defaultPipeline = pipelines.find(p => p.isDefault === 1) || pipelines[0];
  const currentPipelineId = selectedPipeline || defaultPipeline?.id;

  const { data: stages = [] } = useQuery<PipelineStage[]>({
    queryKey: [`/api/pipelines/${currentPipelineId}/stages`],
    enabled: !!currentPipelineId,
  });

  // Build query URL with params
  const buildDealsQueryKey = () => {
    if (!currentPipelineId) return ["/api/deals"];
    const params = new URLSearchParams();
    params.set("pipelineId", currentPipelineId);
    if (selectedOwner !== "all") {
      params.set("ownerId", selectedOwner);
    }
    return [`/api/deals?${params.toString()}`];
  };

  const { data: allDeals = [] } = useQuery<Deal[]>({
    queryKey: buildDealsQueryKey(),
    enabled: !!currentPipelineId,
  });

  const moveDealMutation = useMutation({
    mutationFn: async ({ dealId, toStageId, dealName, stageName }: { dealId: string; toStageId: string; dealName: string; stageName: string }) => {
      return apiRequest("POST", `/api/deals/${dealId}/move-stage`, { toStageId });
    },
    onSuccess: (_, variables) => {
      // Invalidate all deals queries that start with /api/deals
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/deals');
        }
      });
      toast({
        title: "Deal moved",
        description: `${variables.dealName} moved to ${variables.stageName}`,
      });
    },
    onError: (error: any, variables) => {
      toast({
        title: "Failed to move deal",
        description: error?.message || "An error occurred while moving the deal",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const dealId = active.id as string;
    const deal = allDeals.find(d => d.id === dealId);
    if (!deal) return;

    // Determine target stage: either dropped on another deal or directly on a stage column
    let targetStageId: string;
    const overDeal = allDeals.find(d => d.id === over.id);
    
    if (overDeal) {
      // Dropped on another deal - use that deal's stage
      targetStageId = overDeal.stageId;
    } else {
      // Dropped on a stage column directly
      targetStageId = over.id as string;
    }

    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage) return;

    // Only move if changing stages
    if (deal.stageId !== targetStage.id) {
      moveDealMutation.mutate({ 
        dealId, 
        toStageId: targetStage.id,
        dealName: deal.name,
        stageName: targetStage.name,
      });
    }
  };

  const activeDeal = allDeals.find(d => d.id === activeId);
  const activeStage = stages.find(s => s.id === activeDeal?.stageId);
  const currentPipeline = pipelines.find(p => p.id === currentPipelineId);

  const totalPipelineValue = allDeals.reduce((sum, deal) => sum + deal.amount, 0);
  const weightedPipelineValue = allDeals.reduce((sum, deal) => sum + (deal.amount * (deal.probability || 0) / 100), 0);

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-pipeline-title">Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-pipeline-subtitle">
              Manage your deals through the sales pipeline
            </p>
          </div>
          <Button onClick={() => setIsNewDealOpen(true)} data-testid="button-create-deal">
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedPipeline || currentPipelineId} onValueChange={setSelectedPipeline}>
            <SelectTrigger className="w-[200px]" data-testid="select-pipeline">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map(pipeline => (
                <SelectItem key={pipeline.id} value={pipeline.id} data-testid={`option-pipeline-${pipeline.id}`}>
                  {pipeline.name}
                  {pipeline.isDefault === 1 && " (Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedOwner} onValueChange={setSelectedOwner}>
            <SelectTrigger className="w-[200px]" data-testid="select-owner">
              <SelectValue placeholder="Filter by owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="option-owner-all">All Owners</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id} data-testid={`option-owner-${user.id}`}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-4 ml-auto">
            <div className="text-sm">
              <span className="text-muted-foreground">Total Value: </span>
              <span className="font-semibold" data-testid="text-total-pipeline-value">
                ${totalPipelineValue.toLocaleString()}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Weighted: </span>
              <span className="font-semibold" data-testid="text-weighted-pipeline-value">
                ${Math.round(weightedPipelineValue).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {currentPipeline && stages.map(stage => (
            <StageColumn key={stage.id} stage={stage} deals={allDeals} pipeline={currentPipeline} />
          ))}
        </div>

        <DragOverlay>
          {activeId && activeDeal && activeStage ? (
            <DealCard deal={activeDeal} stage={activeStage} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <NewDealDialog
        open={isNewDealOpen}
        onOpenChange={setIsNewDealOpen}
        pipeline={currentPipeline}
        stages={stages}
        users={users}
      />
    </div>
  );
}

function NewDealDialog({
  open,
  onOpenChange,
  pipeline,
  stages,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline?: PipelineType;
  stages: PipelineStage[];
  users: UserType[];
}) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const firstStage = stages[0];

  const form = useForm<InsertDeal>({
    resolver: zodResolver(insertDealSchema),
    defaultValues: {
      name: "",
      pipelineId: pipeline?.id || "",
      stageId: firstStage?.id || "",
      amount: 0,
      probability: 10,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ownerId: users[0]?.id || "",
      status: "open",
      description: "",
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: InsertDeal) => {
      const response = await apiRequest("POST", "/api/deals", data);
      return response.json();
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/deals');
        }
      });
      toast({
        title: "Deal created",
        description: `Successfully created ${deal.name}`,
      });
      form.reset();
      onOpenChange(false);
      navigate(`/deals/${deal.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create deal",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => {
            const pipelineId = data.pipelineId || pipeline?.id;
            if (!pipelineId) {
              toast({
                title: "Error",
                description: "Pipeline is required",
                variant: "destructive",
              });
              return;
            }
            const dealData = {
              ...data,
              stageId: data.stageId || firstStage?.id || stages[0]?.id,
              pipelineId,
              expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
            };
            createDealMutation.mutate(dealData);
          })} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Acme Corp - Enterprise Plan" data-testid="input-new-deal-name" />
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
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-new-deal-amount"
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-new-deal-probability"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-new-deal-owner">
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
                      value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      data-testid="input-new-deal-close-date"
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} rows={3} data-testid="input-new-deal-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-new-deal">
                Cancel
              </Button>
              <Button type="submit" disabled={createDealMutation.isPending} data-testid="button-submit-new-deal">
                {createDealMutation.isPending ? "Creating..." : "Create Deal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
