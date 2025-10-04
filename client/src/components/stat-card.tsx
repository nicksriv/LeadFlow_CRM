import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  color?: "primary" | "success" | "warning" | "info" | "destructive";
}

export function StatCard({ title, value, icon: Icon, trend, description, color = "primary" }: StatCardProps) {
  const colorVariants = {
    primary: {
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      gradient: "from-primary/5 to-transparent"
    },
    success: {
      iconBg: "bg-success/10",
      iconColor: "text-success",
      gradient: "from-success/5 to-transparent"
    },
    warning: {
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      gradient: "from-warning/5 to-transparent"
    },
    info: {
      iconBg: "bg-info/10",
      iconColor: "text-info",
      gradient: "from-info/5 to-transparent"
    },
    destructive: {
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
      gradient: "from-destructive/5 to-transparent"
    }
  };

  const variant = colorVariants[color];

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${variant.gradient}`} data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={`p-2 rounded-lg ${variant.iconBg}`}>
          <Icon className={`h-4 w-4 ${variant.iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums" data-testid={`text-stat-value`}>
          {value}
        </div>
        {(trend || description) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? "text-success" : "text-destructive"
                }`}
              >
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}%
              </span>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
