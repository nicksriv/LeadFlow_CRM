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
  color?: "blue" | "purple" | "orange" | "green" | "pink";
}

export function StatCard({ title, value, icon: Icon, trend, description, color = "blue" }: StatCardProps) {
  const colorVariants = {
    blue: {
      iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500/5 to-transparent dark:from-blue-500/10"
    },
    purple: {
      iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      gradient: "from-purple-500/5 to-transparent dark:from-purple-500/10"
    },
    orange: {
      iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      gradient: "from-orange-500/5 to-transparent dark:from-orange-500/10"
    },
    green: {
      iconBg: "bg-green-500/10 dark:bg-green-500/20",
      iconColor: "text-green-600 dark:text-green-400",
      gradient: "from-green-500/5 to-transparent dark:from-green-500/10"
    },
    pink: {
      iconBg: "bg-pink-500/10 dark:bg-pink-500/20",
      iconColor: "text-pink-600 dark:text-pink-400",
      gradient: "from-pink-500/5 to-transparent dark:from-pink-500/10"
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
                  trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
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
