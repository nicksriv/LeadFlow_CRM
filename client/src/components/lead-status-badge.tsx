import { Badge } from "@/components/ui/badge";
import { Flame, Snowflake, Thermometer } from "lucide-react";
import type { LeadStatus } from "@shared/schema";

interface LeadStatusBadgeProps {
  status: LeadStatus;
  size?: "sm" | "default";
}

export function LeadStatusBadge({ status, size = "default" }: LeadStatusBadgeProps) {
  const getStatusConfig = (status: LeadStatus) => {
    switch (status) {
      case "hot":
        return {
          label: "Hot",
          icon: Flame,
          className: "bg-status-hot text-status-hot-foreground border-status-hot",
        };
      case "warm":
        return {
          label: "Warm",
          icon: Thermometer,
          className: "bg-status-warm text-status-warm-foreground border-status-warm",
        };
      case "cold":
        return {
          label: "Cold",
          icon: Snowflake,
          className: "bg-status-cold text-status-cold-foreground border-status-cold",
        };
      default:
        return {
          label: "Cold",
          icon: Snowflake,
          className: "bg-status-cold text-status-cold-foreground border-status-cold",
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge
      className={config.className}
      variant="default"
      data-testid={`badge-status-${status}`}
    >
      <Icon className={size === "sm" ? "h-3 w-3 mr-1" : "h-3.5 w-3.5 mr-1"} />
      {config.label}
    </Badge>
  );
}
