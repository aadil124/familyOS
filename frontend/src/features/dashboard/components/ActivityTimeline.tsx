import React from "react";
import { FileText, Award, Bell, Sparkles, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

export interface ActivityItem {
  id: string;
  type: "document" | "assessment" | "alert" | "system";
  title: string;
  description: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  items: ActivityItem[];
  isLoading?: boolean;
}

export function ActivityTimeline({ items, isLoading = false }: ActivityTimelineProps) {
  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "document":
        return <FileText className="h-4.5 w-4.5 text-indigo-400" />;
      case "assessment":
        return <Award className="h-4.5 w-4.5 text-amber-500" />;
      case "alert":
        return <Bell className="h-4.5 w-4.5 text-rose-500" />;
      case "system":
        return <Sparkles className="h-4.5 w-4.5 text-violet-400" />;
      default:
        return <HelpCircle className="h-4.5 w-4.5 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pl-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/60" />
            <div className="flex-1 space-y-2 py-0.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground select-none">
        No recent activities recorded. Try uploading a document or running an audit.
      </div>
    );
  }

  return (
    <div className="relative border-l border-border/80 pl-6 ml-3 space-y-6">
      {items.map((item) => {
        // Human-readable date string parsing
        const timeStr = new Date(item.timestamp).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        });
        const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });

        return (
          <div key={item.id} className="relative flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4 group animate-in fade-in duration-200">
            {/* Left timeline dot */}
            <span className="absolute -left-[35px] top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-background border border-border group-hover:border-accent/40 group-hover:scale-110 transition-all duration-300">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground group-hover:bg-accent transition-colors duration-300" />
            </span>

            {/* Visual Icon Badge */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary border border-border/50 text-muted-foreground group-hover:bg-zinc-950 group-hover:border-border transition-colors duration-200">
              {getIcon(item.type)}
            </div>

            {/* Description content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h5 className="text-sm font-semibold text-foreground truncate">
                  {item.title}
                </h5>
                <span className="text-[10px] font-medium text-muted-foreground/60 select-none">
                  {dateStr} at {timeStr}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
