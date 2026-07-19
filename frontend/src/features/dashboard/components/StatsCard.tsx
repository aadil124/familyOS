import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatsCardProps {
  title: string;
  value?: string | number;
  description?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
  trend?: {
    value: string;
    type: "positive" | "negative" | "neutral";
  };
}

export function StatsCard({ title, value, description, icon, isLoading = false, trend }: StatsCardProps) {
  if (isLoading) {
    return (
      <Card className="hover:border-accent/20 transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16 mt-3" />
          <Skeleton className="h-3 w-36 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:border-accent/30 hover:shadow-soft transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
            {title}
          </span>
          {icon && (
            <div className="h-9 w-9 rounded-lg bg-secondary/80 border border-border group-hover:border-accent/20 text-muted-foreground group-hover:text-accent flex items-center justify-center transition-colors duration-300">
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2 mt-3.5">
          <span className="text-3xl font-extrabold tracking-tight text-foreground select-all">
            {value ?? 0}
          </span>
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                trend.type === "positive"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : trend.type === "negative"
                  ? "bg-danger/10 text-danger"
                  : "bg-zinc-500/10 text-zinc-500"
              }`}
            >
              {trend.type === "positive" ? (
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
              ) : trend.type === "negative" ? (
                <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
              ) : null}
              {trend.value}
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed select-none">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
