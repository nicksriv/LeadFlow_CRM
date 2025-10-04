import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Users as UsersIcon, ChevronRight, Mail } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "sales_manager", "sales_rep"]),
  managerId: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function Team() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: managers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/role/sales_manager"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User created",
        description: "Team member has been added successfully",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "sales_rep",
      managerId: undefined,
    },
  });

  const onSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      admin: { label: "Admin", className: "bg-purple-600" },
      sales_manager: { label: "Manager", className: "bg-blue-600" },
      sales_rep: { label: "Sales Rep", className: "bg-green-600" },
    };
    return variants[role] || variants.sales_rep;
  };

  const admins = users.filter((u) => u.role === "admin");
  const managersWithTeams = users
    .filter((u) => u.role === "sales_manager")
    .map((manager) => ({
      ...manager,
      team: users.filter((u) => u.managerId === manager.id),
    }));
  const unassignedReps = users.filter(
    (u) => u.role === "sales_rep" && !u.managerId
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading team...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team hierarchy and user roles
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user">
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Create a new user account and assign their role
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-user-name" />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-user-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-user-role">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="sales_manager">Sales Manager</SelectItem>
                          <SelectItem value="sales_rep">Sales Representative</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("role") === "sales_rep" && managers.length > 0 && (
                  <FormField
                    control={form.control}
                    name="managerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reporting Manager</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-user-manager">
                              <SelectValue placeholder="Select a manager" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {managers.map((manager) => (
                              <SelectItem key={manager.id} value={manager.id}>
                                {manager.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-user"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    data-testid="button-save-user"
                  >
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {admins.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Administrators
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {admins.map((admin) => (
                <Card key={admin.id} data-testid={`card-user-${admin.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{getInitials(admin.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{admin.name}</p>
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {admin.email}
                        </p>
                      </div>
                      <Badge variant="default" className={getRoleBadge(admin.role).className}>
                        {getRoleBadge(admin.role).label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {managersWithTeams.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Sales Teams
            </h2>
            <div className="space-y-4">
              {managersWithTeams.map((manager) => (
                <Card key={manager.id} data-testid={`card-team-${manager.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(manager.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-base">{manager.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {manager.email}
                        </CardDescription>
                      </div>
                      <Badge variant="default" className={getRoleBadge(manager.role).className}>
                        {getRoleBadge(manager.role).label}
                      </Badge>
                    </div>
                  </CardHeader>
                  {manager.team.length > 0 ? (
                    <CardContent className="pt-0">
                      <div className="pl-6 border-l-2 border-muted space-y-2">
                        {manager.team.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                            data-testid={`card-team-member-${member.id}`}
                          >
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{member.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {member.email}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              Sales Rep
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground italic pl-6">
                        No team members assigned
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {unassignedReps.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Unassigned Sales Representatives
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {unassignedReps.map((rep) => (
                <Card key={rep.id} data-testid={`card-unassigned-${rep.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(rep.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{rep.name}</p>
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {rep.email}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {getRoleBadge(rep.role).label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {users.length === 0 && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <UsersIcon className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">No team members yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your first team member to get started
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
