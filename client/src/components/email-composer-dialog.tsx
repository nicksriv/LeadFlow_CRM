import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { EmailTemplate } from "@shared/schema";

interface EmailComposerDialogProps {
  leadId: string;
  leadEmail: string;
  leadName: string;
}

export function EmailComposerDialog({ leadId, leadEmail, leadName }: EmailComposerDialogProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [responseType, setResponseType] = useState<"follow-up" | "answer-question" | "proposal" | "closing">("follow-up");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/leads/${leadId}/send-email`, {
        method: "POST",
        body: JSON.stringify({ subject, body }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to send email");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "activities"] });
      toast({
        title: "Email sent",
        description: `Your email has been sent to ${leadName}`,
      });
      setOpen(false);
      setSubject("");
      setBody("");
      setSelectedTemplateId("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const draftEmailMutation = useMutation<
    { subject: string; body: string },
    Error,
    void
  >({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/draft-email`, { responseType });
      return response.json();
    },
    onSuccess: (data) => {
      setSubject(data.subject);
      setBody(data.body);
      setSelectedTemplateId("");
      toast({
        title: "AI Draft Generated",
        description: "Your email has been drafted using AI. Review and edit as needed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate AI draft. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in both subject and body",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-compose-email">
          <Mail className="w-4 h-4 mr-2" />
          Send Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            Send an email to {leadName} ({leadEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="template">Email Template (Optional)</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger id="template" data-testid="select-email-template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="response-type">AI Response Type</Label>
              <div className="flex gap-2">
                <Select 
                  value={responseType} 
                  onValueChange={(value) => setResponseType(value as "follow-up" | "answer-question" | "proposal" | "closing")}
                >
                  <SelectTrigger id="response-type" data-testid="select-response-type" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                    <SelectItem value="answer-question">Answer Question</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => draftEmailMutation.mutate()}
                  disabled={draftEmailMutation.isPending}
                  data-testid="button-ai-draft"
                  className="shrink-0"
                >
                  {draftEmailMutation.isPending ? (
                    "Generating..."
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Draft
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
              data-testid="input-email-subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
              rows={12}
              data-testid="textarea-email-body"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel-email"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendEmailMutation.isPending}
              data-testid="button-send-email"
            >
              {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
