import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { LeadScoreMeter } from "@/components/lead-score-meter";
import { Link } from "wouter";
import type { Lead, LeadStatus } from "@shared/schema";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Leads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = statusFilter === "all" || lead.status === statusFilter;

    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    all: leads?.length || 0,
    hot: leads?.filter((l) => l.status === "hot").length || 0,
    warm: leads?.filter((l) => l.status === "warm").length || 0,
    cold: leads?.filter((l) => l.status === "cold").length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your leads
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-lead">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px] max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-leads"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="button-filter">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilter === "all" ? "All Leads" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setStatusFilter("all")}
              data-testid="filter-all"
            >
              All Leads ({statusCounts.all})
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStatusFilter("hot")}
              data-testid="filter-hot"
            >
              Hot ({statusCounts.hot})
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStatusFilter("warm")}
              data-testid="filter-warm"
            >
              Warm ({statusCounts.warm})
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStatusFilter("cold")}
              data-testid="filter-cold"
            >
              Cold ({statusCounts.cold})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading leads...</div>
        </div>
      ) : filteredLeads?.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No leads found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first lead"}
              </p>
            </div>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-first-lead">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Lead
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeads?.map((lead) => (
            <Link href={`/leads/${lead.id}`} key={lead.id}>
              <Card
                className="p-4 hover-elevate active-elevate-2 cursor-pointer h-full"
                data-testid={`card-lead-${lead.id}`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" data-testid="text-lead-name">
                        {lead.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.company}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground truncate">
                      {lead.email}
                    </p>
                    {lead.phone && (
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.phone}
                      </p>
                    )}
                  </div>

                  <LeadScoreMeter
                    score={lead.score}
                    status={lead.status as LeadStatus}
                    size="sm"
                  />

                  {lead.lastContactedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last contact:{" "}
                      {new Date(lead.lastContactedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <LeadFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
