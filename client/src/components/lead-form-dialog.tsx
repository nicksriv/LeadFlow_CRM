import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertLeadSchema, type InsertLead, type Lead, type User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead;
}

export function LeadFormDialog({ open, onOpenChange, lead }: LeadFormDialogProps) {
  const { toast } = useToast();
  
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const salesUsers = users.filter(u => u.role === "sales_rep" || u.role === "sales_manager");

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      name: lead?.name || "",
      email: lead?.email || "",
      company: lead?.company || "",
      phone: lead?.phone || "",
      position: lead?.position || "",
      ownerId: lead?.ownerId || undefined,
      notes: lead?.notes || "",
      tags: lead?.tags || [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertLead) => {
      if (lead) {
        return apiRequest("PATCH", `/api/leads/${lead.id}`, data);
      }
      return apiRequest("POST", "/api/leads", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: lead ? "Lead updated" : "Lead created",
        description: lead
          ? "The lead has been updated successfully."
          : "The lead has been added to your pipeline.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertLead) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
          <DialogDescription>
            {lead
              ? "Update the lead information below."
              : "Enter the details of your new lead."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        data-testid="input-lead-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                        data-testid="input-lead-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Acme Inc."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-lead-company"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="CEO"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-lead-position"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-lead-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : value)}
                      value={field.value || "unassigned"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-lead-owner">
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {salesUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role === "sales_manager" ? "Manager" : "Sales Rep"})
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this lead..."
                      {...field}
                      value={field.value || ""}
                      rows={4}
                      data-testid="input-lead-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-lead"
              >
                {mutation.isPending
                  ? "Saving..."
                  : lead
                  ? "Update Lead"
                  : "Create Lead"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
