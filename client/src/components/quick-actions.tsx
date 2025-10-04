import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadFormDialog } from "@/components/lead-form-dialog";

export function QuickActions() {
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);

  return (
    <>
      <Button 
        size="default" 
        className="gap-2"
        onClick={() => setLeadDialogOpen(true)}
        data-testid="button-create-lead"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New Lead</span>
      </Button>

      <LeadFormDialog 
        open={leadDialogOpen} 
        onOpenChange={setLeadDialogOpen}
      />
    </>
  );
}
