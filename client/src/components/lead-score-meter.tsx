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
  const getStatusGradient = (status: LeadStatus) => {
    switch (status) {
      case "hot":
        return "from-orange-500 via-red-500 to-red-600";
      case "warm":
        return "from-yellow-400 via-orange-400 to-orange-500";
      case "cold":
        return "from-blue-400 via-blue-500 to-cyan-500";
      default:
        return "from-blue-400 via-blue-500 to-cyan-500";
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
      <div className="relative w-full bg-muted rounded-full overflow-hidden" data-testid="progress-lead-score">
        <div 
          className={`${heightClass} bg-gradient-to-r ${getStatusGradient(status)} transition-all duration-500 ease-out shadow-sm`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
