import { useQuery } from "@tanstack/react-query";
import { Mail, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { Conversation, Lead } from "@shared/schema";
import { Link } from "wouter";

type ConversationWithLead = Conversation & {
  lead: Lead;
};

export default function Conversations() {
  const { data: conversations, isLoading, refetch } = useQuery<ConversationWithLead[]>({
    queryKey: ["/api/conversations"],
  });

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
          <p className="text-muted-foreground mt-1">
            All email conversations synced from MS 365
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          data-testid="button-sync-conversations"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Now
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading conversations...</div>
        </div>
      ) : conversations?.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No conversations yet</h3>
              <p className="text-muted-foreground mt-1">
                Connect your MS 365 mailbox to start syncing conversations
              </p>
            </div>
            <Button asChild>
              <Link href="/settings">Configure MS 365</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {conversations?.map((conversation) => (
            <Link
              href={`/leads/${conversation.leadId}`}
              key={conversation.id}
            >
              <Card
                className="hover-elevate active-elevate-2 cursor-pointer"
                data-testid={`card-conversation-${conversation.id}`}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(conversation.lead.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">
                          {conversation.lead.name}
                        </CardTitle>
                        <Badge variant={conversation.isFromLead ? "default" : "secondary"}>
                          {conversation.isFromLead ? "Received" : "Sent"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {conversation.lead.company || conversation.lead.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.sentAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <h4 className="font-medium mb-2">{conversation.subject}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {conversation.body}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
