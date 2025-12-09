import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Filter, Users, Download, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { LeadScoreMeter } from "@/components/lead-score-meter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import type { Lead, LeadStatus } from "@shared/schema";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Leads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} data-testid="button-import-leads">
            <Download className="h-4 w-4 mr-2" />
            Import Leads
          </Button>
          <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-lead">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
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
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-2 w-full max-w-xs" />
                </div>
                <Skeleton className="h-16 w-16 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredLeads?.length === 0 ? (
        <Card className="p-12 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
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
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {lead.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
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
                    </div>
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
      <ImportLeadsDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}

function ImportLeadsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState("apollo");
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="apollo" data-testid="tab-apollo">
              Apollo.io
            </TabsTrigger>
            <TabsTrigger value="saleshandy" data-testid="tab-saleshandy">
              Saleshandy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apollo" className="space-y-4">
            <ApolloImportTab onClose={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="saleshandy" className="space-y-4">
            <SaleshandyImportTab onClose={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ApolloImportTab({ onClose }: { onClose: () => void }) {
  const [searchFilters, setSearchFilters] = useState({
    personTitles: "",
    personLocations: "",
    organizationNames: "",
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: async (filters: any) => {
      const response = await fetch("/api/integrations/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personTitles: filters.personTitles ? filters.personTitles.split(",").map((t: string) => t.trim()) : undefined,
          personLocations: filters.personLocations ? filters.personLocations.split(",").map((l: string) => l.trim()) : undefined,
          organizationNames: filters.organizationNames ? filters.organizationNames.split(",").map((o: string) => o.trim()) : undefined,
        }),
      });
      if (!response.ok) throw new Error("Failed to search Apollo.io");
      return response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data.contacts || []);
      setSelectedContacts(new Set());
      toast({
        title: "Search Complete",
        description: `Found ${data.contacts?.length || 0} contacts`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search Apollo.io",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/integrations/apollo/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: {
            personTitles: searchFilters.personTitles ? searchFilters.personTitles.split(",").map((t: string) => t.trim()) : undefined,
            personLocations: searchFilters.personLocations ? searchFilters.personLocations.split(",").map((l: string) => l.trim()) : undefined,
            organizationNames: searchFilters.organizationNames ? searchFilters.organizationNames.split(",").map((o: string) => o.trim()) : undefined,
          },
          selectedContactIds: Array.from(selectedContacts),
        }),
      });
      if (!response.ok) throw new Error("Failed to import from Apollo.io");
      return response.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Import Complete",
        description: `Imported ${data.imported} leads, skipped ${data.skipped}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import from Apollo.io",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    searchMutation.mutate(searchFilters);
  };

  const handleImport = () => {
    if (selectedContacts.size === 0) {
      toast({
        title: "No Contacts Selected",
        description: "Please select at least one contact to import",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate();
  };

  const toggleContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const selectAll = () => {
    if (selectedContacts.size === searchResults.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(searchResults.map(c => c.id)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Job Titles (comma-separated)</label>
          <Input
            placeholder="e.g., CEO, CTO, VP of Sales"
            value={searchFilters.personTitles}
            onChange={(e) => setSearchFilters({ ...searchFilters, personTitles: e.target.value })}
            data-testid="input-apollo-titles"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Locations (comma-separated)</label>
          <Input
            placeholder="e.g., San Francisco, New York"
            value={searchFilters.personLocations}
            onChange={(e) => setSearchFilters({ ...searchFilters, personLocations: e.target.value })}
            data-testid="input-apollo-locations"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Company Names (comma-separated)</label>
          <Input
            placeholder="e.g., Google, Microsoft"
            value={searchFilters.organizationNames}
            onChange={(e) => setSearchFilters({ ...searchFilters, organizationNames: e.target.value })}
            data-testid="input-apollo-companies"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={searchMutation.isPending}
          data-testid="button-apollo-search"
        >
          {searchMutation.isPending ? "Searching..." : "Search Apollo.io"}
        </Button>
      </div>

      {searchResults.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedContacts.size === searchResults.length && searchResults.length > 0}
                onCheckedChange={selectAll}
                data-testid="checkbox-select-all-apollo"
              />
              <span className="text-sm font-medium">
                {selectedContacts.size} of {searchResults.length} selected
              </span>
            </div>
            <Button
              onClick={handleImport}
              disabled={selectedContacts.size === 0 || importMutation.isPending}
              data-testid="button-import-apollo"
            >
              {importMutation.isPending ? "Importing..." : `Import Selected (${selectedContacts.size})`}
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((contact) => (
              <Card key={contact.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedContacts.has(contact.id)}
                    onCheckedChange={() => toggleContact(contact.id)}
                    data-testid={`checkbox-contact-${contact.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {contact.first_name} {contact.last_name}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.title} at {contact.organization?.name}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {contact.email}
                    </p>
                    {contact.city && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {contact.city}, {contact.state}, {contact.country}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {importResults && (
        <Card className="p-4 bg-green-500/10 dark:bg-green-500/20 border-green-500/20">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium">Import Complete</h4>
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{importResults.imported}</span> leads imported
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{importResults.skipped}</span> leads skipped (duplicates)
                </p>
                {importResults.errors > 0 && (
                  <p className="text-red-600 dark:text-red-400">
                    <span className="font-medium">{importResults.errors}</span> errors
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function SaleshandyImportTab({ onClose }: { onClose: () => void }) {
  const [prospects, setProspects] = useState<any[]>([]);
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const { toast } = useToast();

  const { isLoading: isFetching } = useQuery({
    queryKey: ["/api/integrations/saleshandy/prospects", page],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/saleshandy/prospects?page=${page}&limit=20`);
      if (!response.ok) throw new Error("Failed to fetch prospects");
      const data = await response.json();
      setProspects(data.prospects || []);
      setPagination(data.pagination);
      return data;
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/integrations/saleshandy/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page,
          limit: 20,
          selectedProspectIds: Array.from(selectedProspects),
        }),
      });
      if (!response.ok) throw new Error("Failed to import from Saleshandy");
      return response.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Import Complete",
        description: `Imported ${data.imported} leads, skipped ${data.skipped}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import from Saleshandy",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (selectedProspects.size === 0) {
      toast({
        title: "No Prospects Selected",
        description: "Please select at least one prospect to import",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate();
  };

  const toggleProspect = (prospectId: string) => {
    const newSelected = new Set(selectedProspects);
    if (newSelected.has(prospectId)) {
      newSelected.delete(prospectId);
    } else {
      newSelected.add(prospectId);
    }
    setSelectedProspects(newSelected);
  };

  const selectAll = () => {
    if (selectedProspects.size === prospects.length) {
      setSelectedProspects(new Set());
    } else {
      setSelectedProspects(new Set(prospects.map(p => String(p.id))));
    }
  };

  return (
    <div className="space-y-4">
      {isFetching ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : prospects.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedProspects.size === prospects.length && prospects.length > 0}
                onCheckedChange={selectAll}
                data-testid="checkbox-select-all-saleshandy"
              />
              <span className="text-sm font-medium">
                {selectedProspects.size} of {prospects.length} selected
              </span>
            </div>
            <Button
              onClick={handleImport}
              disabled={selectedProspects.size === 0 || importMutation.isPending}
              data-testid="button-import-saleshandy"
            >
              {importMutation.isPending ? "Importing..." : `Import Selected (${selectedProspects.size})`}
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {prospects.map((prospect) => (
              <Card key={String(prospect.id)} className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedProspects.has(String(prospect.id))}
                    onCheckedChange={() => toggleProspect(String(prospect.id))}
                    data-testid={`checkbox-prospect-${prospect.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {prospect.fullName || `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim()}
                        </h4>
                        {prospect.company && (
                          <p className="text-sm text-muted-foreground truncate">
                            {prospect.title && `${prospect.title} at `}{prospect.company}
                          </p>
                        )}
                      </div>
                      {prospect.status && (
                        <Badge variant="outline">{prospect.status}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {prospect.email}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No prospects found in Saleshandy</p>
        </Card>
      )}

      {importResults && (
        <Card className="p-4 bg-green-500/10 dark:bg-green-500/20 border-green-500/20">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium">Import Complete</h4>
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{importResults.imported}</span> leads imported
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{importResults.skipped}</span> leads skipped (duplicates or missing email)
                </p>
                {importResults.errors > 0 && (
                  <p className="text-red-600 dark:text-red-400">
                    <span className="font-medium">{importResults.errors}</span> errors
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
