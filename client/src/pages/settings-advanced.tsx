import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Sliders } from "lucide-react";
import type { ScoringConfig } from "@shared/schema";

export default function SettingsAdvanced() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config } = useQuery<ScoringConfig>({
    queryKey: ["/api/scoring-config"],
  });

  const [sentimentWeight, setSentimentWeight] = useState(config?.sentimentWeight || 25);
  const [engagementWeight, setEngagementWeight] = useState(config?.engagementWeight || 25);
  const [responseTimeWeight, setResponseTimeWeight] = useState(config?.responseTimeWeight || 25);
  const [intentWeight, setIntentWeight] = useState(config?.intentWeight || 25);

  const updateConfigMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/scoring-config", {
        method: "PATCH",
        body: JSON.stringify({
          sentimentWeight,
          engagementWeight,
          responseTimeWeight,
          intentWeight,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to update config");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scoring-config"] });
      toast({
        title: "Settings saved",
        description: "Scoring configuration has been updated successfully",
      });
    },
  });

  const totalWeight = sentimentWeight + engagementWeight + responseTimeWeight + intentWeight;
  const isValidWeight = totalWeight === 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advanced Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure AI scoring algorithms and automation rules
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            <CardTitle>AI Scoring Configuration</CardTitle>
          </div>
          <CardDescription>
            Customize the weight of each factor in the lead scoring algorithm.
            Total weight must equal 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="sentiment">Sentiment Analysis</Label>
                <span className="text-sm font-medium tabular-nums">{sentimentWeight}%</span>
              </div>
              <Slider
                id="sentiment"
                value={[sentimentWeight]}
                onValueChange={([value]) => setSentimentWeight(value)}
                max={100}
                step={5}
                data-testid="slider-sentiment-weight"
              />
              <p className="text-xs text-muted-foreground">
                How positive or engaged the lead's language appears in conversations
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="engagement">Engagement Level</Label>
                <span className="text-sm font-medium tabular-nums">{engagementWeight}%</span>
              </div>
              <Slider
                id="engagement"
                value={[engagementWeight]}
                onValueChange={([value]) => setEngagementWeight(value)}
                max={100}
                step={5}
                data-testid="slider-engagement-weight"
              />
              <p className="text-xs text-muted-foreground">
                Frequency and depth of interactions with the lead
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="response-time">Response Time</Label>
                <span className="text-sm font-medium tabular-nums">{responseTimeWeight}%</span>
              </div>
              <Slider
                id="response-time"
                value={[responseTimeWeight]}
                onValueChange={([value]) => setResponseTimeWeight(value)}
                max={100}
                step={5}
                data-testid="slider-response-time-weight"
              />
              <p className="text-xs text-muted-foreground">
                How quickly the lead responds to your messages
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="intent">Purchase Intent</Label>
                <span className="text-sm font-medium tabular-nums">{intentWeight}%</span>
              </div>
              <Slider
                id="intent"
                value={[intentWeight]}
                onValueChange={([value]) => setIntentWeight(value)}
                max={100}
                step={5}
                data-testid="slider-intent-weight"
              />
              <p className="text-xs text-muted-foreground">
                Signals indicating readiness to purchase or convert
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-sm font-medium">
                Total Weight: <span className={totalWeight === 100 ? "text-green-600" : "text-destructive"}>{totalWeight}%</span>
              </p>
              {!isValidWeight && (
                <p className="text-xs text-destructive mt-1">
                  Weights must total exactly 100%
                </p>
              )}
            </div>
            <Button
              onClick={() => updateConfigMutation.mutate()}
              disabled={!isValidWeight || updateConfigMutation.isPending}
              data-testid="button-save-config"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateConfigMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Automation Rules</CardTitle>
          </div>
          <CardDescription>
            Configure automated lead assignment and routing (coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Advanced automation features will be available here, including automatic lead assignment based on score thresholds, territory routing, and round-robin distribution.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
