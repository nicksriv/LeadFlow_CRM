import { Progress } from "@/components/ui/progress";
import type { LeadStatus } from "@shared/schema";

interface LeadScoreMeterProps {
  score: number;
  status: LeadStatus;
  showLabel?: boolean;
  size?: "sm" | "default" | "lg";
}

export function LeadScoreMeter({ 
  score, 
  status, 
  showLabel = true,
  size = "default" 
}: LeadScoreMeterProps) {
  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case "hot":
        return "bg-status-hot";
      case "warm":
        return "bg-status-warm";
      case "cold":
        return "bg-status-cold";
      default:
        return "bg-status-cold";
    }
  };

  const heightClass = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Lead Score</span>
          <span className="text-sm font-semibold tabular-nums">{score}/100</span>
        </div>
      )}
      <div className="relative">
        <Progress 
          value={score} 
          className={heightClass}
          data-testid="progress-lead-score"
        />
        <div 
          className={`absolute inset-0 rounded-full ${getStatusColor(status)} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
